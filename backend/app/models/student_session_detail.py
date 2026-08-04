from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from app.database import Base
from sqlalchemy.orm import relationship

class StudentSessionDetail(Base):
    __tablename__ = "student_session_details"

    id = Column(Integer, primary_key=True, index=True) # Maps to detail_id
    attendance_id = Column(Integer, ForeignKey("attendance.id", ondelete="CASCADE"), nullable=False, unique=True)
    interactive_rating = Column(Integer, nullable=False, default=0)
    relevant_rating = Column(Integer, nullable=False, default=0)
    learned_today = Column(String, nullable=False, default="")
    key_takeaway = Column(String, nullable=False, default="")
    overall_satisfaction = Column(Integer, nullable=False, default=0)
    issue_note = Column(String, nullable=True)
    submitted_time = Column(DateTime(timezone=True), server_default=func.now())

    # Relationship
    attendance = relationship("AttendanceRecord", backref="session_detail")
