from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime

class UserModel1(BaseModel):
    username: str
    email: str
    password: str

class UserModel2(BaseModel):
    username: str
    password: str

class TokenModel(BaseModel):
    access_token: str
    token_type: str
    refresh_token: str

class TokenData(BaseModel):
    username: Optional[str] = None

class AlertModel(BaseModel):
    alertType: str
    recipients: List[str]
    subject: str
    content: str 
    sent: Optional[datetime]  
    received: Optional[datetime]   
    priority: str  
    status: Optional[str] = "Unsent"