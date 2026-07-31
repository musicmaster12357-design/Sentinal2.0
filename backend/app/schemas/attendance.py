from pydantic import BaseModel
from datetime import datetime
from typing import Optional

class QRScanRequest(BaseModel):
    session_id: int
    nonce: str
    issued_at: int
    expires: int
    signature: str

class ManualAttendanceRequest(BaseModel):
    campus_id: str

class SessionFormRequest(BaseModel):
    session_id: int
    # Session Details
    interactive_rating: int
    relevant_rating: int
    learned_today: str
    key_takeaway: str
    overall_satisfaction: int
    issue_note: Optional[str] = None

class AttendanceResponse(BaseModel):
    id: int
    student_id: int
    session_id: int
    timestamp: datetime
    status: str

    class Config:
        from_attributes = True
