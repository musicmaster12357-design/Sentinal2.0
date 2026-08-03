from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.attendance import AttendanceRecord
from app.models.session import AttendanceSession
from app.models.user import User
from app.models.student_session_detail import StudentSessionDetail
from app.schemas.attendance import SessionFormRequest
from fastapi import HTTPException
import uuid

async def verify_and_start_workflow(db: AsyncSession, session_id: int, student_id: int) -> AttendanceRecord:
    import datetime
    import pytz
    
    ist = pytz.timezone('Asia/Kolkata')
    now_ist = datetime.datetime.now(ist).date()
    
    # Check if a record already exists for this session
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    )
    res = await db.execute(stmt)
    record = res.scalars().first()
    
    if record:
        if record.workflow_state == "confirmed":
            raise HTTPException(status_code=400, detail="Attendance already confirmed for this session")
        return record # return existing pending record
        
    # Start new workflow
    record = AttendanceRecord(
        student_id=student_id,
        session_id=session_id,
        workflow_state="scanned",
        status="pending"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    return record

async def complete_attendance_workflow(db: AsyncSession, session_id: int, student_id: int, form_data: SessionFormRequest, lecture_hall: str = None) -> AttendanceRecord:
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.student_id == student_id
    )
    res = await db.execute(stmt)
    record = res.scalars().first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Workflow not started. Please scan the QR first.")
        
    if record.workflow_state == "confirmed":
        raise HTTPException(status_code=400, detail="Attendance already confirmed")
        
    record.workflow_state = "confirmed"
    record.status = "present"
    
    detail = StudentSessionDetail(
        attendance_id=record.id,
        lecture_hall=lecture_hall,
        seat_number=form_data.seat_number,
        feedback_rating=form_data.feedback_rating,
        feedback_comments=form_data.feedback_comments,
        need_follow_up=form_data.need_follow_up,
        issue_note=form_data.issue_note
    )
    db.add(detail)
    
    await db.commit()
    await db.refresh(record)
    return record
