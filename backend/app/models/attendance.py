from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, UniqueConstraint
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship

class AttendanceRecord(Base):
    __tablename__ = "attendance"

    id = Column(Integer, primary_key=True, index=True)
    student_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    session_id = Column(Integer, ForeignKey("attendance_sessions.id", ondelete="CASCADE"), nullable=False)
    timestamp = Column(DateTime(timezone=True), server_default=func.now())
    
    # Workflow states: scanned -> form_submitted -> confirmed
    workflow_state = Column(String, default="scanned")
    status = Column(String, default="pending") # pending, present, absent

    # Relationships
    student = relationship("User")
    session = relationship("AttendanceSession")

    __table_args__ = (
        UniqueConstraint('student_id', 'session_id', name='uq_student_session'),
    )
