import uvicorn
from fastapi import FastAPI, HTTPException, Depends
from jose import jwt, JWTError
from typing import Optional
from pymongo import ASCENDING
import json
from fastapi.middleware.cors import CORSMiddleware
import logging
import asyncio
from SharedService.database_operations import view_document, update_document
from SharedService.model import AlertModel as _AlertModel
from SharedService.auth import get_current_user
from fastapi.security import OAuth2PasswordBearer
from SharedService.redis_pubsub import subscribe_to_channel
from SharedService.database import db

app = FastAPI()

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="token")

SECRET_KEY = " "
ALGORITHM = "HS256"

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

logger = logging.getLogger(__name__)

async def get_current_user(token: str = Depends(oauth2_scheme)):
    logger.debug(f"Received token: {token}")
    if not token:
        raise HTTPException(status_code=401, detail="Token not provided")
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Invalid credentials")
        logger.debug(f"Token decoded successfully, user_id: {user_id}")
        return {"user_id": user_id}
    except JWTError as e:
        logger.error(f"JWTError: {e}")
        raise HTTPException(status_code=401, detail="Invalid credentials")

def redis_listener():
    pubsub = subscribe_to_channel("user_registered")
    pubsub.subscribe("user_logged_in")
    pubsub.subscribe("alert_created")
    pubsub.subscribe("alerts_created")
    pubsub.subscribe("alerts_uploaded")

    logger.debug("Subscribed to Redis channels")

    for message in pubsub.listen():
        if message['type'] == 'message':
            data = json.loads(message['data'])
            logger.info(f"Received message: {data}")

@app.on_event("startup")
async def startup_event():
    logger.info("DashboardService is starting up")
    loop = asyncio.get_event_loop()
    loop.run_in_executor(None, redis_listener)

@app.get("/alerts")
async def get_alerts(
    page: int = 1,
    limit: int = 5,
    alertType: Optional[str] = None,
    priority: Optional[str] = None,
    status: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    search: Optional[str] = None,
    current_user: dict = Depends(get_current_user)
):
    alerts_collection = db["Alerts"]
    query = {}

    if alertType:
        query['alertType'] = alertType
    if priority:
        query['priority'] = priority
    if status:
        query['status'] = status
    if start_date and end_date:
        query['sent'] = {
            "$gte": start_date,
            "$lte": end_date
        }
    if search:
        query['$or'] = [
            {"alertType": {"$regex": search, "$options": "i"}},
            {"recipients": {"$regex": search, "$options": "i"}},
            {"subject": {"$regex": search, "$options": "i"}},
            {"content": {"$regex": search, "$options": "i"}},
            {"priority": {"$regex": search, "$options": "i"}},
            {"status": {"$regex": search, "$options": "i"}},
        ]

    total_alerts = alerts_collection.count_documents(query)
    alerts = list(alerts_collection.find(query)
                  .sort("sent", ASCENDING)
                  .skip((page - 1) * limit)
                  .limit(limit))

    for alert in alerts:
        alert['_id'] = str(alert['_id'])

    logger.info(f"Fetched {len(alerts)} alerts")
    return {"alerts": alerts, "total": total_alerts}

@app.get("/alert-counts")
async def get_alert_counts(current_user: dict = Depends(get_current_user)):
    alerts_collection = db["Alerts"]
    alert_counts = {
        "MS Teams": alerts_collection.count_documents({"alertType": "MS Teams"}),
        "Email": alerts_collection.count_documents({"alertType": "Email"}),
        "SMS": alerts_collection.count_documents({"alertType": "SMS"})
    }
    return {"alert_counts": alert_counts}

@app.put("/alerts/{alert_id}")
async def update_alert(alert_id: str, updated_data: dict, current_user: dict = Depends(get_current_user)):
    existing_alert = view_document("Alerts", alert_id)

    if not existing_alert:
        raise HTTPException(status_code=404, detail="Alert not found")

    updated_fields = {
        "status": updated_data.get("status", existing_alert.get("status")),
        "received": existing_alert.get("received")
    }

    result = update_document("Alerts", alert_id, updated_fields)

    if result:
        return {"message": "Update successful"}
    else:
        raise HTTPException(status_code=500, detail="Update failed")

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="127.0.0.1", port=8003)
