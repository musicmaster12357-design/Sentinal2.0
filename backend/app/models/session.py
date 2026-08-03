from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from app.database import Base

class AttendanceSession(Base):
    __tablename__ = "attendance_sessions"

    id = Column(Integer, primary_key=True, index=True)
    faculty_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    subject_id = Column(Integer, ForeignKey("subjects.id", ondelete="CASCADE"), nullable=True) # made integer
    start_time = Column(DateTime(timezone=True), nullable=False)
    end_time = Column(DateTime(timezone=True), nullable=True)
    title = Column(String, nullable=True)
    time_slot = Column(String, nullable=True)
    
    # QR Engine properties
    secret_key = Column(String, nullable=True) # Used to sign the QRs for this session
    current_qr = Column(String, nullable=True) # Static QR token valid for session lifetime
    is_active = Column(Boolean, default=True)
    status = Column(String, default="active")
