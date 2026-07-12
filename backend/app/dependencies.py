
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from app.config import settings
from app.security.jwt_handler import verify_token
from app.schemas.user import TokenData

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="api/auth/login")
import time
import asyncio

class MockRedis:
    def __init__(self):
        self.store = {}
        
    async def set(self, key, value, ex=None):
        expire_at = time.time() + ex if ex else None
        self.store[key] = {"value": value, "expire_at": expire_at}
        
    async def get(self, key):
        if key in self.store:
            item = self.store[key]
            if item["expire_at"] and time.time() > item["expire_at"]:
                del self.store[key]
                return None
            return item["value"]
        return None
        
    async def delete(self, key):
        if key in self.store:
            del self.store[key]

redis_client = MockRedis()

async def get_redis():
    return redis_client

async def get_current_user(token: str = Depends(oauth2_scheme)):
    payload = verify_token(token)
    if payload is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return TokenData(email=payload.get("sub"), role=payload.get("role"), user_id=payload.get("user_id"))

async def get_current_faculty(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "faculty":
        raise HTTPException(status_code=403, detail="Not authorized, faculty only")
    return current_user

async def get_current_student(current_user: TokenData = Depends(get_current_user)):
    if current_user.role != "student":
        raise HTTPException(status_code=403, detail="Not authorized, student only")
    return current_user
