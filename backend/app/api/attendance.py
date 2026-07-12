from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.attendance import QRScanRequest, SessionFormRequest, AttendanceResponse
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
    from app.models.student_session_detail import StudentSessionDetail
    
    stmt = select(AttendanceRecord, AttendanceSession, StudentSessionDetail).join(
        AttendanceSession, AttendanceRecord.session_id == AttendanceSession.id
    ).outerjoin(
        StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id
    ).where(
        AttendanceRecord.student_id == current_user.user_id
    ).order_by(AttendanceRecord.timestamp.desc())
    
    res = await db.execute(stmt)
    records = res.all()
    
    history = []
    for record, session, detail in records:
        has_feedback = bool(detail and detail.interactive_rating and detail.interactive_rating > 0)
        history.append({
            "id": record.id,
            "session_id": session.id,
            "subject_id": session.subject_id,
            "date": (record.timestamp.isoformat() + "Z") if record.timestamp and not record.timestamp.tzinfo else (record.timestamp.isoformat() if record.timestamp else None),
            "status": record.status,
            "has_feedback": has_feedback
        })
        
    from app.models.student import Student
    from sqlalchemy import func
    
    student_res = await db.execute(select(Student).where(Student.id == current_user.user_id))
    student = student_res.scalar_one_or_none()
    
    percentage = 100
    if student and student.semester:
        total_stmt = select(func.count(AttendanceSession.id)).where(
            AttendanceSession.semester == student.semester,
            AttendanceSession.status == 'closed'
        )
        total_res = await db.execute(total_stmt)
        total_sessions = total_res.scalar() or 0
        
        if total_sessions > 0:
            # attended sessions are just len(records)
            percentage = round((len(records) / total_sessions) * 100)

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

    return [{
        "student_name": s.name,
        "campus_id": s.campus_id,
        "subject_id": sess.subject_id,
        "session_date": sess.start_time.isoformat() if sess.start_time else None,
        "interactive_rating": d.interactive_rating,
        "relevant_rating": d.relevant_rating,
        "learned_today": d.learned_today,
        "key_takeaway": d.key_takeaway,
        "overall_satisfaction": d.overall_satisfaction,
        "submitted_time": d.submitted_time.isoformat() if d.submitted_time else None,
        "email": s.email,
        "phone": s.phone,
        "course": s.course,
        "specialisation": s.specialisation
    } for r, s, d, sess in records]
