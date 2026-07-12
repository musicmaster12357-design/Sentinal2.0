from sqlalchemy import Column, Integer, String
from app.database import Base

class Faculty(Base):
    __tablename__ = "faculty"

    id = Column(Integer, primary_key=True, index=True) # Maps to faculty_id
    name = Column(String, nullable=False)
    email = Column(String, unique=True, index=True, nullable=False)
    department = Column(String, nullable=True)
    password_hash = Column(String, nullable=False)
