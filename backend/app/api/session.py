from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from app.database import get_db
from app.schemas.session import SessionCreate, SessionResponse
from sqlalchemy import select
from app.models.session import AttendanceSession
from app.models.user import User
from app.core.security import generate_qr_signature
from app.core.permissions import get_current_user, RequirePermission
import time
import uuid
import json
import base64

router = APIRouter(prefix="/api/session", tags=["session"])

# Require "start_session" or similar permission
# For now, to match old logic, we'll just check if role is User or admin
def _generate_static_qr_token(session_id: int, expires: int) -> str:
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
    return base64.urlsafe_b64encode(json.dumps(payload).encode()).decode()

@router.post("/start", response_model=SessionResponse)
async def start_session(data: SessionCreate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone, timedelta
    import pytz
    
    IST = pytz.timezone('Asia/Kolkata')
    
    if data.time_slot:
        try:
            start_str, end_str = data.time_slot.split('-')
            def parse_time(t_str):
                h, m = map(int, t_str.split(':'))
                return h, m

            sh, sm = parse_time(start_str)
            eh, em = parse_time(end_str)
            
            now_ist = datetime.now(IST)
            if data.session_date:
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
        
    expires_unix = int((start_time + timedelta(days=3650)).timestamp())

    # Allow multiple concurrent active sessions

    new_session = AttendanceSession(
        faculty_id=current_user.id,
        subject_id=None, # Will need to adapt frontend schema or let subject_id map to academic.py
        start_time=start_time,
        end_time=end_time,
        title=data.title,
        time_slot=data.time_slot,
        is_active=True,
        status="active"
    )
    
    db.add(new_session)
    await db.commit()
    await db.refresh(new_session)

    qr_token = _generate_static_qr_token(new_session.id, expires_unix)
    new_session.current_qr = qr_token
    await db.commit()

    return {
        "id": new_session.id,
        "faculty_id": new_session.faculty_id,
        "subject_id": str(new_session.subject_id) if new_session.subject_id else data.subject, # Fallback to string for frontend compatibility for now
        "start_time": new_session.start_time,
        "end_time": new_session.end_time,
        "semester": data.semester,
        "title": new_session.title,
        "speaker": data.speaker,
        "time_slot": new_session.time_slot,
        "status": new_session.status
    }

@router.post("/{session_id}/end")
async def end_session(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from datetime import datetime, timezone
    
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.id
    )
    res = await db.execute(stmt)
    session_obj = res.scalars().first()
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found or not yours")
        
    if session_obj.status != "active":
        raise HTTPException(status_code=400, detail="Session already ended")
        
    session_obj.status = "completed"
    session_obj.is_active = False
    session_obj.end_time = datetime.now(timezone.utc)
    
    await db.commit()
    return {"message": "Session ended successfully"}

@router.get("/{session_id}/info")
async def get_session_info(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(AttendanceSession).where(AttendanceSession.id == session_id)
    res = await db.execute(stmt)
    session_obj = res.scalars().first()
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found")
        
    return {
        "id": session_obj.id,
        "title": session_obj.title,
        "time_slot": session_obj.time_slot,
        "subject_id": session_obj.subject_id,
        "status": session_obj.status
    }

@router.get("/active")
async def get_active_session(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(AttendanceSession).where(
        AttendanceSession.faculty_id == current_user.id,
        AttendanceSession.status == "active"
    )
    res = await db.execute(stmt)
    session_obj = res.scalars().first()
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="No active session")
        
    return {
        "id": session_obj.id,
        "faculty_id": session_obj.faculty_id,
        "subject_id": str(session_obj.subject_id),
        "start_time": session_obj.start_time,
        "end_time": session_obj.end_time,
        "title": session_obj.title,
        "time_slot": session_obj.time_slot,
        "status": session_obj.status,
        "current_qr": session_obj.current_qr
    }

@router.delete("/{session_id}")
async def delete_session(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.id
    )
    res = await db.execute(stmt)
    session_obj = res.scalars().first()
    
    if not session_obj:
        raise HTTPException(status_code=404, detail="Session not found or not yours")
        
    await db.delete(session_obj)
    await db.commit()
    return {"message": "Session deleted successfully"}

@router.get("/{session_id}/ws-url")
async def get_websocket_url(session_id: int, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    from app.core.config import settings
    # Ensure they own it
    stmt = select(AttendanceSession).where(
        AttendanceSession.id == session_id,
        AttendanceSession.faculty_id == current_user.id
    )
    res = await db.execute(stmt)
    if not res.scalars().first():
        raise HTTPException(status_code=404, detail="Session not found or not yours")
        
    base = settings.DATABASE_URL
    if base.startswith("postgresql"):
        ws_base = "wss" if "railway.app" in base else "ws"
    else:
        ws_base = "ws"
        
    return {"ws_url": f"{ws_base}://localhost:8000/ws/attendance/{session_id}"}
