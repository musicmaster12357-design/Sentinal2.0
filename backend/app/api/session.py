from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.session import SessionCreate, SessionResponse
from sqlalchemy import select
from app.models.session import AttendanceSession
from app.models.faculty import Faculty
from app.security.signatures import generate_qr_signature
import time
import uuid
import json
import base64
from fastapi.security import OAuth2PasswordBearer

router = APIRouter(prefix="/api/session", tags=["session"])
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

async def get_current_faculty(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    from app.security.jwt_handler import verify_token
    payload = verify_token(token)
    if not payload or payload.get("role") != "faculty":
        raise HTTPException(status_code=401, detail="Invalid token or unauthorized")
    
    stmt = select(Faculty).where(Faculty.email == payload.get("sub"))
    res = await db.execute(stmt)
    faculty = res.scalars().first()
    if not faculty:
        raise HTTPException(status_code=401, detail="Faculty not found")
    return faculty

def _generate_static_qr_token(session_id: int, expires: int) -> str:
    """Generate a signed QR token that is valid until 'expires' (unix timestamp)."""
    nonce = str(uuid.uuid4())[:8]
    issued_at = int(time.time())
    signature = generate_qr_signature(session_id, nonce, issued_at, expires)
    payload = {
        "version": 1,
        "session_id": session_id,
        "nonce": nonce,
        "issued_at": issued_at,
        "expires": expires,
        "signature": signature
    }
    token = base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()
    return token

@router.post("/start", response_model=SessionResponse)
async def start_session(data: SessionCreate, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone, timedelta
    import pytz
    
    IST = pytz.timezone('Asia/Kolkata')
    
    if data.time_slot:
        # e.g. "09:30-11:00", "01:30-03:30"
        # Since it's a fixed list, we can parse it easily
        try:
            start_str, end_str = data.time_slot.split('-')
            
            # Helper to parse "01:30" or "11:00" into hours and minutes
            def parse_time(t_str):
                h, m = map(int, t_str.split(':'))
                return h, m

            sh, sm = parse_time(start_str)
            eh, em = parse_time(end_str)
            
            now_ist = datetime.now(IST)
            if data.session_date:
                # Expecting YYYY-MM-DD
                try:
                    yr, mo, da = map(int, data.session_date.split('-'))
                    now_ist = now_ist.replace(year=yr, month=mo, day=da)
                except Exception:
                    pass
            
            start_time_ist = now_ist.replace(hour=sh, minute=sm, second=0, microsecond=0)
            end_time_ist = now_ist.replace(hour=eh, minute=em, second=0, microsecond=0)
            
            start_time = start_time_ist.astimezone(timezone.utc)
            end_time = end_time_ist.astimezone(timezone.utc)
        except Exception:
            # Fallback
            start_time = datetime.now(timezone.utc)
            end_time = start_time + timedelta(minutes=data.duration) if data.duration else start_time + timedelta(hours=2)
    else:
        start_time = datetime.now(timezone.utc)
        if data.session_date:
            try:
                yr, mo, da = map(int, data.session_date.split('-'))
                start_time = start_time.replace(year=yr, month=mo, day=da)
            except Exception:
                pass
        end_time = start_time + timedelta(minutes=data.duration) if data.duration else start_time + timedelta(hours=2)
        
    # Set QR expiration to 10 years in the future so it doesn't expire until session is closed manually
    expires_unix = int((start_time + timedelta(days=3650)).timestamp())

    # Auto-close any previously active sessions
    stmt_close = select(AttendanceSession).where(AttendanceSession.faculty_id == faculty.id, AttendanceSession.status == "active")
    res_close = await db.execute(stmt_close)
    active_sessions = res_close.scalars().all()
    for s in active_sessions:
        s.status = "closed"
        s.end_time = start_time
        s.current_qr = None
    
    if active_sessions:
        await db.commit()

    new_session = AttendanceSession(
        faculty_id=faculty.id,
        subject_id=data.subject,
        semester=data.semester,
        start_time=start_time,
        end_time=end_time,
        title=data.title,
        speaker=data.speaker,
        time_slot=data.time_slot,
        status="active"
    )
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    # Generate static QR token valid for session lifetime
    qr_token = _generate_static_qr_token(new_session.id, expires_unix)
    new_session.current_qr = qr_token
    await db.commit()
    await db.refresh(new_session)

    return new_session

@router.post("/{id}/close", response_model=SessionResponse)
async def close_session(id: int, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    
    stmt = select(AttendanceSession).where(AttendanceSession.id == id, AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    session.status = "closed"
    session.current_qr = None  # Invalidate QR immediately on close
    
    await db.commit()
    await db.refresh(session)
    return session

@router.get("/{id}/qr")
async def get_session_qr(id: int, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    """Returns the pre-generated static QR for this session (no rotation)."""
    stmt = select(AttendanceSession).where(AttendanceSession.id == id, AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session or session.status != "active":
        raise HTTPException(status_code=400, detail="Invalid or inactive session")

    if not session.current_qr:
        raise HTTPException(status_code=400, detail="QR not yet generated for this session")

    import qrcode
    import io

    base_url = "http://localhost:5173"
    qr_url = f"{base_url}/student/verify-attendance/{session.current_qr}"
    
    qr = qrcode.QRCode(version=1, box_size=10, border=4)
    qr.add_data(qr_url)
    qr.make(fit=True)
    img = qr.make_image(fill_color="black", back_color="white")
    
    buffered = io.BytesIO()
    img.save(buffered, format="PNG") # type: ignore
    qr_base64 = base64.b64encode(buffered.getvalue()).decode('utf-8')
    
    return {
        "token": session.current_qr,
        "qr_code": f"data:image/png;base64,{qr_base64}",
        "expires": int(session.end_time.timestamp()) if session.end_time else None,
        "end_time": (session.end_time.isoformat() + "Z") if session.end_time and not session.end_time.tzinfo else (session.end_time.isoformat() if session.end_time else None)
    }

@router.get("/{id}/info")
async def get_session_info(id: int, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    """Get session metadata including end_time for countdown timer."""
    stmt = select(AttendanceSession).where(AttendanceSession.id == id, AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    
    return {
        "id": session.id,
        "subject_id": session.subject_id,
        "status": session.status,
        "start_time": (session.start_time.isoformat() + "Z") if session.start_time and not session.start_time.tzinfo else (session.start_time.isoformat() if session.start_time else None),
        "end_time": (session.end_time.isoformat() + "Z") if session.end_time and not session.end_time.tzinfo else (session.end_time.isoformat() if session.end_time else None),
        "current_qr": session.current_qr,
        "title": session.title,
        "speaker": session.speaker,
    }

@router.delete("/{id}")
async def delete_session(id: int, faculty: Faculty = Depends(get_current_faculty), db: AsyncSession = Depends(get_db)):
    stmt = select(AttendanceSession).where(AttendanceSession.id == id, AttendanceSession.faculty_id == faculty.id)
    res = await db.execute(stmt)
    session = res.scalars().first()
    
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
        
    # Delete related attendance records manually to avoid foreign key constraint errors if cascade isn't set up
    from app.models.attendance import AttendanceRecord
    from app.models.student_session_detail import StudentSessionDetail
    
    attendance_stmt = select(AttendanceRecord).where(AttendanceRecord.session_id == id)
    attendance_res = await db.execute(attendance_stmt)
    records = attendance_res.scalars().all()
    
    for r in records:
        # Delete details
        detail_stmt = select(StudentSessionDetail).where(StudentSessionDetail.attendance_id == r.id)
        detail_res = await db.execute(detail_stmt)
        detail = detail_res.scalars().first()
        if detail:
            await db.delete(detail)
        await db.delete(r)
        
    await db.delete(session)
    await db.commit()
    
    return {"message": "Session and its attendance records deleted successfully"}
