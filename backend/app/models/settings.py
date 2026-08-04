from sqlalchemy import Column, String
from app.database import Base

class SystemSettings(Base):
    __tablename__ = "system_settings"

    key = Column(String, primary_key=True, index=True)
    value = Column(String, nullable=False)
