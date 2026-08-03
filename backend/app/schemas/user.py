from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List
from datetime import datetime

class Token(BaseModel):
    access_token: str
    refresh_token: Optional[str] = None
    token_type: str

class TokenData(BaseModel):
    sub: Optional[str] = None
    role: Optional[str] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    campus_id: str
    role_name: str
    phone: Optional[str] = None

class ProfileResponse(BaseModel):
    name: str
    phone: Optional[str] = None
    avatar: Optional[str] = None
    department_id: Optional[int] = None

class UserResponse(BaseModel):
    id: int
    uuid: str
    campus_id: str
    email: str
    status: str
    role: str
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    specialisation: Optional[str] = None
    semester: Optional[str] = None
    profile: Optional[ProfileResponse] = None

    class Config:
        from_attributes = True

class RefreshRequest(BaseModel):
    refresh_token: str

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str = Field(..., min_length=8)

class UserProfileUpdate(BaseModel):
    name: Optional[str] = None
    phone: Optional[str] = None
    department: Optional[str] = None
    course: Optional[str] = None
    specialisation: Optional[str] = None
    semester: Optional[str] = None
