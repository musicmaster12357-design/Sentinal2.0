from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.attendance import QRScanRequest, SessionFormRequest, AttendanceResponse, ManualAttendanceRequest
from app.services.attendance_service import verify_and_start_workflow, complete_attendance_workflow
from app.security.signatures import verify_qr_signature, is_qr_expired
from app.models.session import AttendanceSession
from app.dependencies import get_current_student, get_current_faculty
from app.schemas.user import TokenData

router = APIRouter(prefix="/api/attendance", tags=["attendance"])

@router.post("/scan")
async def scan_qr(data: QRScanRequest, db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_student)):
    if is_qr_expired(data.expires):
        raise HTTPException(status_code=400, detail="QR code expired. Please scan the latest one.")
        
    if not verify_qr_signature(data.session_id, data.nonce, data.issued_at, data.expires, data.signature):
        raise HTTPException(status_code=400, detail="Invalid QR signature.")
        
    stmt = select(AttendanceSession).where(AttendanceSession.id == data.session_id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session or not session.is_active or session.status != "active":
        raise HTTPException(status_code=400, detail="Invalid or inactive session.")
        
    from app.models.student import Student
    student_stmt = select(Student).where(Student.id == current_user.user_id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()
    
    # Check if student already marked attendance for THIS session
    from app.models.attendance import AttendanceRecord
    
    existing_attendance_stmt = select(AttendanceRecord).where(
        AttendanceRecord.student_id == current_user.user_id,
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
    record = await verify_and_start_workflow(db, session.id, current_user.user_id)
    
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
        
        # Broadcast to faculty websocket
        from app.websocket.attendance_socket import manager

        await manager.broadcast_attendance_update(session.id, {
            "student_id": current_user.user_id,
            "name": student.name if student else None,
            "email": current_user.email,
            "department": student.department if student else None,
            "course": student.course if student else None,
            "specialisation": student.specialisation if student else None,
            "semester": student.semester if student else None,
            "campus_id": student.campus_id if student else None,
            "time": (record.timestamp.isoformat() + "Z") if record.timestamp and not record.timestamp.tzinfo else (record.timestamp.isoformat() if record.timestamp else None),
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
async def manual_checkin(session_id: int, data: ManualAttendanceRequest, db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.student import Student
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    from datetime import datetime, timezone
    
    # Verify session belongs to faculty
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.user_id,
        AttendanceSession.status == "active",
        AttendanceSession.is_active == True
    )
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=400, detail="Invalid or inactive session.")
        
    # Find student by campus_id
    student_stmt = select(Student).where(Student.campus_id == data.campus_id)
    student_res = await db.execute(student_stmt)
    student = student_res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found with this Campus ID.")
        
    # Check if student already marked attendance
    existing_attendance_stmt = select(AttendanceRecord).where(
        AttendanceRecord.student_id == student.id,
        AttendanceRecord.session_id == session.id,
        AttendanceRecord.status == "present"
    )
    existing_attendance_res = await db.execute(existing_attendance_stmt)
    if existing_attendance_res.scalars().first():
        raise HTTPException(
            status_code=403, 
            detail="Student is already marked present."
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
    
    # Broadcast to faculty websocket
    from app.websocket.attendance_socket import manager
    await manager.broadcast_attendance_update(session.id, {
        "student_id": student.id,
        "name": student.name,
        "email": student.email,
        "department": student.department,
        "course": student.course,
        "specialisation": student.specialisation,
        "semester": student.semester,
        "campus_id": student.campus_id,
        "time": (record.timestamp.isoformat() + "Z") if record.timestamp and not record.timestamp.tzinfo else (record.timestamp.isoformat() if record.timestamp else None),
        "status": record.status,
        "interactive_rating": detail.interactive_rating,
        "relevant_rating": detail.relevant_rating,
        "learned_today": detail.learned_today,
        "key_takeaway": detail.key_takeaway,
        "overall_satisfaction": detail.overall_satisfaction
    })
    
    return {"message": "Student marked present manually."}

@router.delete("/session/{session_id}/student/{student_id}")
async def remove_attendance(session_id: int, student_id: int, db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    
    # Verify session belongs to faculty
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.user_id,
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
        
    # Delete the student session detail (feedback) if exists
    detail_stmt = select(StudentSessionDetail).where(StudentSessionDetail.attendance_id == record.id)
    detail_res = await db.execute(detail_stmt)
    detail = detail_res.scalars().first()
    
    if detail:
        await db.delete(detail)
        
    # Delete the attendance record
    await db.delete(record)
    await db.commit()
    
    # Broadcast to faculty websocket to remove student
    from app.websocket.attendance_socket import manager
    # We will send a special type of message: "attendance_removed"
    # To do this safely without modifying the websocket manager, we'll just broadcast an update with status="removed"
    # and let the frontend filter them out.
    await manager.broadcast_attendance_update(session.id, {
        "student_id": student_id,
        "status": "removed"
    })
    
    return {"message": "Student removed from session."}

@router.post("/feedback", response_model=dict)
async def submit_feedback(data: SessionFormRequest, db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_student)):
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    
    # Find the attendance record
    stmt = select(AttendanceRecord).where(
        AttendanceRecord.session_id == data.session_id,
        AttendanceRecord.student_id == current_user.user_id
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
        
        # Broadcast the updated details to the faculty websocket
        from app.models.student import Student
        student_stmt = select(Student).where(Student.id == current_user.user_id)
        student_res = await db.execute(student_stmt)
        student = student_res.scalars().first()
        
        from app.websocket.attendance_socket import manager
        await manager.broadcast_attendance_update(data.session_id, {
            "student_id": current_user.user_id,
            "name": student.name if student else None,
            "email": current_user.email,
            "department": student.department if student else None,
            "course": student.course if student else None,
            "specialisation": student.specialisation if student else None,
            "semester": student.semester if student else None,
            "campus_id": student.campus_id if student else None,
            "time": (record.timestamp.isoformat() + "Z") if record.timestamp and not record.timestamp.tzinfo else (record.timestamp.isoformat() if record.timestamp else None),
            "status": record.status,
            "interactive_rating": detail.interactive_rating,
            "relevant_rating": detail.relevant_rating,
            "learned_today": detail.learned_today,
            "key_takeaway": detail.key_takeaway,
            "overall_satisfaction": detail.overall_satisfaction
        })
        
    return {"message": "Feedback submitted successfully"}

@router.get("/history")
async def get_attendance_history(db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_student)):
    from app.models.attendance import AttendanceRecord
    from app.models.session import AttendanceSession
    from app.models.student import Student
    from sqlalchemy import func
    
    # 1. Get the current student
    student_res = await db.execute(select(Student).where(Student.id == current_user.user_id))
    student = student_res.scalar_one_or_none()
    
    if not student:
        return {"history": [], "percentage": 0}
        
    # 2. Find all sessions that this student should have attended based on semester
    session_stmt = select(AttendanceSession).where(
        AttendanceSession.semester == student.semester
    ).order_by(AttendanceSession.start_time.desc())
    
    session_res = await db.execute(session_stmt)
    sessions = session_res.scalars().all()
    
    # 3. Find all attendance records for this student
    record_stmt = select(AttendanceRecord).where(AttendanceRecord.student_id == student.id)
    record_res = await db.execute(record_stmt)
    records = record_res.scalars().all()
    
    # Map session_id to record for quick lookup
    record_map = {r.session_id: r for r in records}
    
    history = []
    attended_count = 0
    
    for session in sessions:
        record = record_map.get(session.id)
        if record:
            attended_count += 1
            status = record.status
            timestamp = record.timestamp
        else:
            status = "absent"
            timestamp = session.start_time
            
        history.append({
            "id": record.id if record else f"missing-{session.id}",
            "session_id": session.id,
            "subject_id": session.subject_id,
            "date": (timestamp.isoformat() + "Z") if timestamp and not timestamp.tzinfo else (timestamp.isoformat() if timestamp else None),
            "status": status,
            "has_feedback": False # Assuming false for absent, could query detail if needed
        })
        
    percentage = 0
    if len(sessions) > 0:
        percentage = round((attended_count / len(sessions)) * 100)

    return {"history": history, "percentage": percentage}

    return {"history": history, "percentage": percentage}


@router.get("/session/{session_id}/state")
async def get_session_state(session_id: int, current_user: TokenData = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    from app.models.attendance import AttendanceRecord
    from app.models.student import Student
    from app.models.student_session_detail import StudentSessionDetail
    
    # Fetch from DB for resilience across restarts
    stmt = select(AttendanceRecord, Student, StudentSessionDetail).join(
        Student, AttendanceRecord.student_id == Student.id
    ).outerjoin(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.status == "present"
    ).order_by(AttendanceRecord.timestamp.desc())
    
    res = await db.execute(stmt)
    records = res.all()
    
    attendees = [{
        "student_id": s.id,
        "name": s.name,
        "email": s.email,
        "department": s.department,
        "course": s.course,
        "specialisation": s.specialisation,
        "semester": s.semester,
        "time": (r.timestamp.isoformat() + "Z") if r.timestamp and not r.timestamp.tzinfo else (r.timestamp.isoformat() if r.timestamp else None),
        "campus_id": s.campus_id,
    } for r, s, d in records]
    
    # Fetch static QR from database
    from app.models.session import AttendanceSession
    sess_stmt = select(AttendanceSession).where(AttendanceSession.id == session_id)
    sess_res = await db.execute(sess_stmt)
    session = sess_res.scalars().first()
    
    return {
        "qr_token": session.current_qr if session else None,
        "start_time": session.start_time.isoformat() if (session and session.start_time) else None,
        "end_time": session.end_time.isoformat() if (session and session.end_time) else None,
        "attendees": attendees
    }

@router.get("/students")
async def get_all_students(db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.student import Student
    stmt = select(Student)
    res = await db.execute(stmt)
    students = res.scalars().all()
    
    return [{
        "id": s.id,
        "name": s.name,
        "email": s.email,
        "department": s.department,
        "course": s.course,
        "specialisation": s.specialisation,
        "semester": s.semester,
        "campus_id": s.campus_id,
        "status": s.status
    } for s in students]

@router.get("/faculty/sessions")
async def get_faculty_sessions(db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.session import AttendanceSession
    from app.models.attendance import AttendanceRecord
    from sqlalchemy import func
    
    stmt = select(AttendanceSession).where(
        AttendanceSession.faculty_id == current_user.user_id
    ).order_by(AttendanceSession.start_time.desc())
    
    res = await db.execute(stmt)
    sessions = res.scalars().all()
    # Removed auto-close logic because we want sessions to remain open until explicitly closed by the faculty.
    
    return [{
        "id": s.id,
        "subject_id": s.subject_id,
        "semester": s.semester,
        "start_time": s.start_time.isoformat() if s.start_time else None,
        "end_time": s.end_time.isoformat() if s.end_time else None,
        "status": s.status
    } for s in sessions]

@router.get("/faculty/sessions/{session_id}/attendees")
async def get_session_attendees(session_id: int, db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.attendance import AttendanceRecord
    from app.models.student import Student
    from app.models.student_session_detail import StudentSessionDetail
    
    stmt = select(AttendanceRecord, Student, StudentSessionDetail).join(
        Student, AttendanceRecord.student_id == Student.id
    ).outerjoin(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).where(
        AttendanceRecord.session_id == session_id,
        AttendanceRecord.status == "present"
    )
    
    res = await db.execute(stmt)
    records = res.all()
    
    return [{
        "id": r.id,
        "student_id": s.id,
        "name": s.name,
        "email": s.email,
        "department": s.department,
        "course": s.course,
        "specialisation": s.specialisation,
        "semester": s.semester,
        "time": r.timestamp.isoformat() if r.timestamp else None,
        "campus_id": s.campus_id,
        "interactive_rating": d.interactive_rating if d else None,
        "relevant_rating": d.relevant_rating if d else None,
        "learned_today": d.learned_today if d else None,
        "key_takeaway": d.key_takeaway if d else None,
        "overall_satisfaction": d.overall_satisfaction if d else None,
        "issue_note": d.issue_note if d else None
    } for r, s, d in records]

@router.get("/faculty/feedbacks")
async def get_all_feedbacks(db: AsyncSession = Depends(get_db), current_user: TokenData = Depends(get_current_faculty)):
    from app.models.attendance import AttendanceRecord
    from app.models.student import Student
    from app.models.student_session_detail import StudentSessionDetail
    from app.models.session import AttendanceSession
    from datetime import timezone, timedelta

    IST = timezone(timedelta(hours=5, minutes=30))

    stmt = select(AttendanceRecord, Student, StudentSessionDetail, AttendanceSession).join(
        Student, AttendanceRecord.student_id == Student.id
    ).join(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).where(
        AttendanceSession.faculty_id == current_user.user_id,
        StudentSessionDetail.overall_satisfaction > 0  # Assuming 0 is default/unsubmitted
    ).order_by(StudentSessionDetail.submitted_time.desc())

    res = await db.execute(stmt)
    records = res.all()

    def to_ist_iso(dt):
        if not dt: return None
        # SQLite stores naive datetimes which are actually UTC
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt.astimezone(IST).isoformat()

    return [{
        "student_name": s.name,
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
        "phone": s.phone,
        "course": s.course,
        "specialisation": s.specialisation
    } for r, s, d, sess in records]
