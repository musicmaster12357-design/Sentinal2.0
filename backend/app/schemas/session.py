from pydantic import BaseModel
from typing import Optional
from datetime import date, time, datetime

class SessionCreate(BaseModel):
    subject: str
    semester: Optional[str] = None
    duration: Optional[int] = 60  # Default 60 minutes

class SessionResponse(BaseModel):
    id: int
    faculty_id: int
    subject_id: str
    status: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    current_qr: Optional[str] = None

    class Config:
        from_attributes = True
