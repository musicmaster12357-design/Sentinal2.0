from pydantic import BaseModel, EmailStr, Field
from typing import Optional

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    email: Optional[str] = None
    role: Optional[str] = None
    user_id: Optional[int] = None

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserCreate(BaseModel):
    email: EmailStr
    password: str
    name: str
    department: str

class StudentRegister(BaseModel):
    campus_id: str = Field(..., min_length=3, max_length=20, pattern=r'^[a-zA-Z0-9]+$')
    name: str
    email: EmailStr
    password: str
    department: str
    course: str
    specialisation: str
    semester: str
    phone: str

class StudentImportItem(BaseModel):
    campus_id: str
    name: str
    email: EmailStr
    department: str
    course: str
    year: str
    section: str

class ActivateRequest(BaseModel):
    token: str
    password: str
