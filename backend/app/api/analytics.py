from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, func
from app.database import get_db
from app.models.attendance import AttendanceRecord
from app.models.session import AttendanceSession
from app.models.student import Student
from app.models.student_session_detail import StudentSessionDetail
from app.models.faculty import Faculty
from app.api.session import get_current_faculty

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")
router = APIRouter(prefix="/api/analytics", tags=["analytics"])

@router.get("/dashboard")
async def get_dashboard_stats(faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    # Total sessions by this faculty
    stmt = select(func.count(AttendanceSession.id)).where(AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    total_sessions = res.scalar() or 0
    
    # Active session
    stmt = select(AttendanceSession).where(AttendanceSession.faculty_id == faculty.id, AttendanceSession.status == "active")
    res = await db.execute(stmt)
    active_session = res.scalars().first()
    
    # Total attendance recorded across all sessions
    stmt = select(func.count(AttendanceRecord.id)).join(AttendanceSession).where(AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    total_attendance = res.scalar() or 0
    
    return {
        "total_sessions": total_sessions,
        "active_session": active_session.id if active_session else None,
        "total_attendance": total_attendance
    }

@router.get("/session/{session_id}/report")
async def get_session_report(session_id: int, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    # Verify session belongs to faculty
    stmt = select(AttendanceSession).where(AttendanceSession.id == session_id, AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    stmt = (
        select(Student, AttendanceRecord, StudentSessionDetail)
        .join(AttendanceRecord, Student.id == AttendanceRecord.student_id)
        .outerjoin(StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id)
        .where(AttendanceRecord.session_id == session_id)
    )
    res = await db.execute(stmt)
    records = res.all()
    
    report = []
    for student, attendance, detail in records:
        report.append({
            "student_name": student.name,
            "student_id": student.register_number,
            "department": student.department,
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
async def get_all_students(faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    stmt = select(Student).order_by(Student.created_at.desc())
    res = await db.execute(stmt)
    students = res.scalars().all()
    return students
