from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from app.database import Base

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("faculty.id"), nullable=False)
    subject_id = Column(String, nullable=False)
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    semester = Column(String, nullable=True)
    title = Column(String, nullable=True)
    speaker = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    
    # QR Engine properties
    secret_key = Column(String, nullable=True) # Used to sign the QRs for this session
    current_qr = Column(String, nullable=True) # Static QR token valid for session lifetime
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active")
