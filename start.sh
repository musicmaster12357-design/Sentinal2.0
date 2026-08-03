#!/bin/bash
cd backend
# Safely create all tables that don't exist yet, bypassing Alembic state issues
python -c "
import asyncio
from app.database import engine
from app.models.user import User
from app.models.rbac import Role, Permission
from app.models.academic import Department, Course, Semester, Section, Subject, Enrollment
from app.models.session import AttendanceSession
from app.models.attendance import AttendanceRecord
from app.models.student_session_detail import StudentSessionDetail
from app.database import Base

async def init_db():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
asyncio.run(init_db())
"
# Start the application
uvicorn app.main:app --host 0.0.0.0 --port ${PORT:-8000}
