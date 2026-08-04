from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.attendance import AttendanceRecord
from app.core.permissions import get_current_user
from app.models.session import AttendanceSession
from app.models.user import User
from app.models.student_session_detail import StudentSessionDetail
from app.models.user import User
from app.api.session import get_current_user

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(User: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Total sessions by this User
    stmt = select(func.count(AttendanceSession.id)).where(AttendanceSession.faculty_id == User.id)
    res = await db.execute(stmt)
    total_sessions = res.scalar() or 0
    
    # Active session
    stmt = select(AttendanceSession).where(AttendanceSession.faculty_id == User.id, AttendanceSession.status == "active")
    res = await db.execute(stmt)
    active_session = res.scalars().first()
    
    # Total attendance recorded across all sessions
    stmt = select(func.count(AttendanceRecord.id)).join(AttendanceSession).where(AttendanceSession.faculty_id == User.id)
    res = await db.execute(stmt)
    total_attendance = res.scalar() or 0
    
    # Calculate average feedback rating
    stmt = select(func.avg(StudentSessionDetail.overall_satisfaction)).join(AttendanceRecord).join(AttendanceSession).where(
        AttendanceSession.faculty_id == User.id,
        StudentSessionDetail.overall_satisfaction != None
    )
    res = await db.execute(stmt)
    avg_rating = res.scalar() or 0.0
    
    return {
        "total_sessions": total_sessions,
        "active_session": active_session.id if active_session else None,
        "total_attendance": total_attendance,
        "feedback_rating": round(avg_rating, 1)
    }

@router.get("/session/{session_id}/report")
async def get_session_report(session_id: int, User: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Verify session belongs to User
    stmt = select(AttendanceSession).where(AttendanceSession.id == session_id, AttendanceSession.faculty_id == User.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    stmt = (
        select(User, AttendanceRecord, StudentSessionDetail)
        .join(AttendanceRecord, User.id == AttendanceRecord.student_id)
        .outerjoin(StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id)
        .where(AttendanceRecord.session_id == session_id)
    )
    res = await db.execute(stmt)
    records = res.all()
    
    report = []
    for User, attendance, detail in records:
        report.append({
            "student_name": User.name,
            "student_id": User.register_number,
            "department": User.department,
            "time": attendance.timestamp,
            "status": attendance.status,
            "feedback_rating": detail.feedback_rating if detail else None,
            "feedback_comments": detail.feedback_comments if detail else None,
            "lecture_hall": detail.lecture_hall if detail else None,
        })
        
    return {
        "session": {
            "id": session.id,
            "subject": session.subject_id,
            "date": session.start_time
        },
        "attendance": report
    }

@router.get("/students")
async def get_all_students(User: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(User).order_by(User.created_at.desc())
    res = await db.execute(stmt)
    students = res.scalars().all()
    return students
