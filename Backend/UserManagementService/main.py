from fastapi import FastAPI, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from SharedService.auth import (
    create_access_token,
    create_refresh_token,
    verify_password,
    get_password_hash,
    SECRET_KEY,
    REFRESH_SECRET_KEY,
    ALGORITHM,
)
from SharedService.database_operations import insert_document, view_document
from SharedService.model import UserModel1, UserModel2, TokenModel, TokenData
from jose import JWTError, jwt
from SharedService.redis_pubsub import publish_message
from fastapi.middleware.cors import CORSMiddleware
from pymongo import MongoClient
from decouple import config
from datetime import datetime, timedelta

app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")

MONGO_URI = config("MONGO_URI")
client = MongoClient(MONGO_URI)
db = client["alert_system_db"]

def insert_document(collection_name, document):
    collection = db[collection_name]
    result = collection.insert_one(document)
    return str(result.inserted_id)

def view_document(collection_name, query):
    collection = db[collection_name]
    document = collection.find_one(query)
    if document:
        document['_id'] = str(document['_id'])
    return document

SECRET_KEY = "naveen_raj_secret_key"  
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 150

def create_access_token(data: dict):
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


@app.post("/signup")
async def signup(user: UserModel1):
    if view_document("users", {"username": user.username}):
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    user_data = {
        "username": user.username,
        "email": user.email,
        "password": hashed_password,
    }
    insert_document("users", user_data)
    publish_message("user_registered", user.json())
    return {"message": "User registered successfully"}

@app.post("/login", response_model=TokenModel)
async def login(user: UserModel2):
    db_user = view_document("users", {"username": user.username})
    if not db_user or not verify_password(user.password, db_user["password"]):
        raise HTTPException(status_code=400, detail="Invalid credentials")
    access_token = create_access_token(data={"sub": user.username})
    refresh_token = create_refresh_token(data={"sub": user.username})
    publish_message("user_logged_in", user.json())
    return {"access_token": access_token, "token_type": "bearer", "refresh_token": refresh_token}

@app.post("/refresh-token", response_model=TokenModel)
async def refresh_token(refresh_token: str):
    try:
        payload = jwt.decode(refresh_token, REFRESH_SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
        new_access_token = create_access_token(data={"sub": username})
        return {"access_token": new_access_token, "token_type": "bearer"}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")

async def get_current_user(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username: str = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        token_data = TokenData(username=username)
    except JWTError:
        raise HTTPException(status_code=401, detail="Could not validate token")
    user = view_document("users", {"username": token_data.username})
    if user is None:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@app.get("/health")
async def health_check():
    return {"message": "Backend is running"}

@app.get("/protected-route")
async def protected_route(current_user: UserModel2 = Depends(get_current_user)):
    return {"message": f"Hello, {current_user['username']}! You are authenticated."}

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8001)