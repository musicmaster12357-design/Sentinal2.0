from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.sql import func
from app.database import Base
import uuid

class Student(Base):
    __tablename__ = "students"

    id = Column(Integer, primary_key=True, index=True)
    uuid = Column(String, unique=True, index=True, default=lambda: str(uuid.uuid4()))
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    course = Column(String, nullable=True)
    specialisation = Column(String, nullable=True)
    department = Column(String, nullable=False)
    semester = Column(String, nullable=True)
    campus_id = Column(String, unique=True, index=True, nullable=True)
    phone = Column(String, nullable=True)
    
    status = Column(String, default="active")
    password_hash = Column(String, nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
