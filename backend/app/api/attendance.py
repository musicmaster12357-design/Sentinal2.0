from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.attendance import QRScanRequest, SessionFormRequest, AttendanceResponse, ManualAttendanceRequest
from app.services.attendance_service import verify_and_start_workflow, complete_attendance_workflow
from app.core.security import verify_qr_signature, is_qr_expired
from app.models.session import AttendanceSession
from app.core.permissions import get_current_user, RequirePermission
from app.models.user import User

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/scan")
async def scan_qr(data: QRScanRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    if is_qr_expired(data.expires):
        raise HTTPException(status_code=400, detail="QR code expired. Please scan the latest one.")
        
    if not verify_qr_signature(data.session_id, data.nonce, data.issued_at, data.expires, data.signature):
        raise HTTPException(status_code=400, detail="Invalid QR signature.")
        
    stmt = select(AttendanceSession).where(AttendanceSession.id == data.session_id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session or not session.is_active or session.status != "active":
        raise HTTPException(status_code=400, detail="Invalid or inactive session.")
        
    from app.models.user import User
    from sqlalchemy.orm import selectinload
    student_stmt = select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()
    
    # Check if User already marked attendance for THIS session
    from app.models.attendance import AttendanceRecord
    
    existing_attendance_stmt = select(AttendanceRecord).where(
        AttendanceRecord.student_id == current_user.id,
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status == "present"
    )
    existing_attendance_res = await db.execute(existing_attendance_stmt)
    if existing_attendance_res.scalars().first():
        raise HTTPException(
            status_code=403, 
            detail="You have already marked attendance for this session."
        )
    # Start and complete the workflow instantly
    record = await verify_and_start_workflow(db, session.id, current_user.id)
    
    if record.workflow_state != "confirmed":
        record.workflow_state = "confirmed"
        record.status = "present"
        
        # Add a default detail record since we're skipping the form
        from app.models.student_session_detail import StudentSessionDetail
        detail = StudentSessionDetail(
            attendance_id=record.id,
            issue_note=None
        )
        db.add(detail)
        await db.commit()
        await db.refresh(record)
        
        # Broadcast to User websocket
        from app.websocket.attendance_socket import manager

        await manager.broadcast_attendance_update(session.id, {
            "student_id": current_user.id,
            "name": student.profile.name if (student and student.profile and student.profile.name) else None,
            "email": current_user.email,
            "department": student.profile.department_name if (student and student.profile) else None,
            "course": student.profile.course_name if (student and student.profile) else None,
            "specialisation": student.profile.specialisation if (student and student.profile) else None,
            "semester": student.profile.semester_name if (student and student.profile) else None,
            "campus_id": current_user.campus_id,
            "time": (record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None,
            "status": record.status,
            "interactive_rating": detail.interactive_rating,
            "relevant_rating": detail.relevant_rating,
            "learned_today": detail.learned_today,
            "key_takeaway": detail.key_takeaway,
            "overall_satisfaction": detail.overall_satisfaction
        })
        
    return {
        "session_id": session.id,
        "subject_id": session.subject_id,
        "workflow_state": record.workflow_state
    }

@router.post("/session/{session_id}/manual")
async def manual_checkin(session_id: int, data: ManualAttendanceRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.user import User
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    from datetime import datetime, timezone
    
    # Verify session belongs to User
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.id,
        AttendanceSession.status == "active"
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=400, detail="Invalid or inactive session.")
        
    # Find User by campus_id
    from sqlalchemy.orm import selectinload
    student_stmt = select(User).options(selectinload(User.profile)).where(User.campus_id == data.campus_id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="User not found with this Campus ID.")
        
    # Check if User already marked attendance
    existing_attendance_stmt = select(AttendanceRecord).where(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status == "present"
    )
    existing_attendance_res = await db.execute(existing_attendance_stmt)
    if existing_attendance_res.scalars().first():
        raise HTTPException(
            status_code=403, 
            detail="User is already marked present."
        )
        
    # Create attendance record
    record = AttendanceRecord(
        session_id=session.id,
        student_id=student.id,
        timestamp=datetime.now(timezone.utc),
        status="present",
        workflow_state="confirmed"
    )
    db.add(record)
    await db.commit()
    await db.refresh(record)
    
    # Create empty feedback
    detail = StudentSessionDetail(
        attendance_id=record.id,
        issue_note=None
    )
    db.add(detail)
    await db.commit()
    
    # Broadcast to User websocket
    from app.websocket.attendance_socket import manager
    await manager.broadcast_attendance_update(session.id, {
        "student_id": student.id,
        "name": student.profile.name if student.profile else "Unknown",
        "email": student.email,
        "department": student.profile.department_name if student.profile else None,
        "course": student.profile.course_name if student.profile else None,
        "specialisation": student.profile.specialisation if student.profile else None,
        "semester": student.profile.semester_name if student.profile else None,
        "campus_id": student.campus_id,
        "time": (record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None,
        "status": record.status,
        "interactive_rating": detail.interactive_rating,
        "relevant_rating": detail.relevant_rating,
        "learned_today": detail.learned_today,
        "key_takeaway": detail.key_takeaway,
        "overall_satisfaction": detail.overall_satisfaction
    })
    
    return {"message": "User marked present manually."}

@router.delete("/session/{session_id}/student/{student_id}")
async def remove_attendance(session_id: int, student_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    
    # Verify session belongs to User
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.id,
        AttendanceSession.status == "active"
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=400, detail="Invalid or inactive session.")
        
    # Find the attendance record
    record_stmt = select(AttendanceRecord).where(
        AttendanceRecord.student_id == student_id,
        AttendanceRecord.session_id == session.id
    )
    record_res = await db.execute(record_stmt)
    record = record_res.scalars().first()
    
    if not record:
        raise HTTPException(status_code=404, detail="Attendance record not found.")
        
    # Delete the User session detail (feedback) if exists
    detail_stmt = select(StudentSessionDetail).where(StudentSessionDetail.attendance_id == record.id)
    detail_res = await db.execute(detail_stmt)
    detail = detail_res.scalars().first()
    
    if detail:
        await db.delete(detail)
        
    # Delete the attendance record
    await db.delete(record)
    await db.commit()
    
    # Broadcast to User websocket to remove User
    from app.websocket.attendance_socket import manager
    # We will send a special type of message: "attendance_removed"
    # To do this safely without modifying the websocket manager, we'll just broadcast an update with status="removed"
    # and let the frontend filter them out.
    await manager.broadcast_attendance_update(session.id, {
        "student_id": student_id,
        "status": "removed"
    })
    
    return {"message": "User removed from session."}

@router.post("/feedback", response_model=dict)
async def submit_feedback(data: SessionFormRequest, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    
    # Find the attendance record
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == data.session_id,
        AttendanceRecord.student_id == current_user.id
    )
    res = await db.execute(stmt)
    record = res.scalars().first()
    
    if not record:
        raise HTTPException(status_code=400, detail="Attendance record not found.")
        
    # Update the details
    stmt = select(StudentSessionDetail).where(StudentSessionDetail.attendance_id == record.id)
    res = await db.execute(stmt)
    detail = res.scalars().first()
    
    if detail:
        detail.interactive_rating = data.interactive_rating
        detail.relevant_rating = data.relevant_rating
        detail.learned_today = data.learned_today
        detail.key_takeaway = data.key_takeaway
        detail.overall_satisfaction = data.overall_satisfaction
        await db.commit()
        
        # Broadcast the updated details to the User websocket
        from app.models.user import User
        from sqlalchemy.orm import selectinload
        student_stmt = select(User).options(selectinload(User.profile)).where(User.id == current_user.id)
        student_res = await db.execute(student_stmt)
        student = student_res.scalars().first()
        
        from app.websocket.attendance_socket import manager
        await manager.broadcast_attendance_update(data.session_id, {
            "student_id": current_user.id,
            "name": student.profile.name if student and student.profile else "Unknown",
            "email": current_user.email,
            "department": student.profile.department_name if student and student.profile else None,
            "course": student.profile.course_name if student and student.profile else None,
            "specialisation": student.profile.specialisation if student and student.profile else None,
            "semester": student.profile.semester_name if student and student.profile else None,
            "campus_id": student.campus_id if student else None,
            "time": (record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None,
            "status": record.status,
            "interactive_rating": detail.interactive_rating,
            "relevant_rating": detail.relevant_rating,
            "learned_today": detail.learned_today,
            "key_takeaway": detail.key_takeaway,
            "overall_satisfaction": detail.overall_satisfaction
        })
        
    return {"message": "Feedback submitted successfully"}

@router.get("/history")
async def get_attendance_history(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.attendance import AttendanceRecord
    from app.models.session import AttendanceSession
    from sqlalchemy import select
    
    # 1. Get all attendance records for this student
    record_stmt = (
        select(AttendanceRecord, AttendanceSession)
        .join(AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id)
        .where(AttendanceRecord.student_id == current_user.id)
        .order_by(AttendanceSession.start_time.desc())
    )
    
    res = await db.execute(record_stmt)
    records = res.all()
    
    history = []
    
    for record, session in records:
        history.append({
            "id": record.id,
            "session_id": session.id,
            "title": session.title or f"Session {session.id}",
            "subject": str(session.subject_id) if session.subject_id else "General",
            "date": (session.start_time.replace(microsecond=0).isoformat() + ("Z" if not getattr(session.start_time, "tzinfo", None) else "")) if session.start_time else None,
            "status": record.status,
            "timestamp": (record.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(record.timestamp, "tzinfo", None) else "")) if record.timestamp else None
        })
        
    from sqlalchemy import func
    total_stmt = select(func.count(AttendanceSession.id))
    total_res = await db.execute(total_stmt)
    total_sessions = total_res.scalar() or 0
    
    percentage = round((len(records) / total_sessions) * 100) if total_sessions > 0 else 100
    
    return {
        "history": history,
        "percentage": percentage
    }


@router.get("/session/{session_id}/state")
async def get_session_state(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.models.attendance import AttendanceRecord
    from app.models.user import User
    from app.models.student_session_detail import StudentSessionDetail
    
    from sqlalchemy.orm import selectinload
    
    # Fetch from DB for resilience across restarts
    stmt = select(AttendanceRecord, User, StudentSessionDetail).join(
        User, AttendanceRecord.student_id == User.id
    ).outerjoin(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).options(
        selectinload(User.profile)
    ).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.status == "present"
    ).order_by(AttendanceRecord.timestamp.desc())
    
    res = await db.execute(stmt)
    records = res.all()
    
    attendees = [{
        "student_id": s.id,
        "name": s.profile.name if (s.profile and s.profile.name) else None,
        "email": s.email,
        "department": s.profile.department_name if s.profile else None,
        "course": s.profile.course_name if s.profile else None,
        "specialisation": s.profile.specialisation if s.profile else None,
        "semester": s.profile.semester_name if s.profile else None,
        "time": (r.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(r.timestamp, "tzinfo", None) else "")) if r.timestamp else None,
        "campus_id": s.campus_id,
    } for r, s, d in records]
    
    # Fetch static QR from database
    from app.models.session import AttendanceSession
    sess_stmt = select(AttendanceSession).where(AttendanceSession.id == session_id)
    sess_res = await db.execute(sess_stmt)
    session = sess_res.scalars().first()
    
    return {
        "qr_token": session.current_qr if session else None,
        "start_time": (session.start_time.replace(microsecond=0).isoformat() + ("Z" if not getattr(session.start_time, "tzinfo", None) else "")) if (session and session.start_time) else None,
        "end_time": (session.end_time.replace(microsecond=0).isoformat() + ("Z" if not getattr(session.end_time, "tzinfo", None) else "")) if (session and session.end_time) else None,
        "attendees": attendees
    }



@router.get("/faculty/sessions")
async def get_faculty_sessions(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.session import AttendanceSession
    from app.models.attendance import AttendanceRecord
    from sqlalchemy import func
    
    stmt = select(AttendanceSession).where(
        AttendanceSession.faculty_id == current_user.id
    ).order_by(AttendanceSession.start_time.desc())
    
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    # Removed auto-close logic because we want sessions to remain open until explicitly closed by the User.
    
    return [{
        "id": s.id,
        "subject_id": s.subject_id,
        "start_time": (s.start_time.replace(microsecond=0).isoformat() + ("Z" if not getattr(s.start_time, "tzinfo", None) else "")) if s.start_time else None,
        "end_time": (s.end_time.replace(microsecond=0).isoformat() + ("Z" if not getattr(s.end_time, "tzinfo", None) else "")) if s.end_time else None,
        "status": s.status
    } for s in sessions]

@router.get("/faculty/sessions/{session_id}/attendees")
async def get_session_attendees(session_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.attendance import AttendanceRecord
    from app.models.user import User
    from app.models.student_session_detail import StudentSessionDetail
    
    stmt = select(AttendanceRecord, User, StudentSessionDetail).join(
        User, AttendanceRecord.student_id == User.id
    ).outerjoin(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).options(selectinload(User.profile)).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.status == "present"
    )
    
    res = await db.execute(stmt)
    records = res.all()
    
    return [{
        "id": r.id,
        "student_id": s.id,
        "name": (s.profile.name if s.profile else 'N/A'),
        "email": s.email,
        "department": (s.profile.department if s.profile else 'N/A'),
        "course": (s.profile.course if s.profile else 'N/A'),
        "specialisation": (s.profile.specialisation if s.profile else 'N/A'),
        "semester": (s.profile.semester if s.profile else 'N/A'),
        "time": (r.timestamp.replace(microsecond=0).isoformat() + ("Z" if not getattr(r.timestamp, "tzinfo", None) else "")) if r.timestamp else None,
        "campus_id": s.campus_id,
        "interactive_rating": d.interactive_rating if d else None,
        "relevant_rating": d.relevant_rating if d else None,
        "learned_today": d.learned_today if d else None,
        "key_takeaway": d.key_takeaway if d else None,
        "overall_satisfaction": d.overall_satisfaction if d else None,
        "issue_note": d.issue_note if d else None
    } for r, s, d in records]

@router.get("/faculty/feedbacks")
async def get_all_feedbacks(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    from app.models.attendance import AttendanceRecord
    from app.models.user import User
    from app.models.student_session_detail import StudentSessionDetail
    from app.models.session import AttendanceSession
    from datetime import timezone, timedelta

    IST = timezone(timedelta(hours=5, minutes=30))

    from app.models.user import Profile
    stmt = select(AttendanceRecord, User, StudentSessionDetail, AttendanceSession, Profile).join(
        User, AttendanceRecord.student_id == User.id
    ).join(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).outerjoin(
        Profile, User.id == Profile.user_id
    ).where(
        AttendanceSession.faculty_id == current_user.id,
        StudentSessionDetail.overall_satisfaction > 0  # Assuming 0 is default/unsubmitted
    ).order_by(StudentSessionDetail.submitted_time.desc())

    res = await db.execute(stmt)
    records = res.all()

    def to_ist_iso(dt):
        if not dt: return None
        # SQLite stores naive datetimes which are actually UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(IST).replace(microsecond=0).isoformat()

    return [{
        "student_name": (p.name if p else 'N/A'),
        "campus_id": s.campus_id,
        "session_id": sess.id,
        "subject_id": sess.subject_id,
        "session_date": to_ist_iso(sess.start_time),
        "interactive_rating": d.interactive_rating,
        "relevant_rating": d.relevant_rating,
        "learned_today": d.learned_today,
        "key_takeaway": d.key_takeaway,
        "overall_satisfaction": d.overall_satisfaction,
        "submitted_time": to_ist_iso(d.submitted_time),
        "email": s.email,
        "phone": p.phone if p else None,
        "course": (p.course_name if p else 'N/A'),
        "specialisation": (p.specialisation if p else 'N/A')
    } for r, s, d, sess, p in records]
