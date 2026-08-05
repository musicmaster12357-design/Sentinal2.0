import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.attendance import AttendanceRecord
from app.models.student_session_detail import StudentSessionDetail
from app.models.session import AttendanceSession
from datetime import datetime, timezone, timedelta
import pytz
import openpyxl

async def run():
    async with AsyncSessionLocal() as session:
        current_user = (await session.execute(select(User).where(User.email == 'faculty@test.com'))).scalars().first()
        
        IST = timezone(timedelta(hours=5, minutes=30))
        date_str = "2026-08-05"
        date_obj = datetime.strptime(date_str, "%Y-%m-%d").date()
        start_dt = datetime.combine(date_obj, datetime.min.time()).replace(tzinfo=IST)
        end_dt = datetime.combine(date_obj, datetime.max.time()).replace(tzinfo=IST)
        
        start_utc = start_dt.astimezone(timezone.utc)
        end_utc = end_dt.astimezone(timezone.utc)
        
        session_res = await session.execute(select(AttendanceSession).where(
            AttendanceSession.faculty_id == current_user.id,
            AttendanceSession.start_time >= start_utc,
            AttendanceSession.start_time <= end_utc
        ))
        sessions = session_res.scalars().all()
        session_ids = [s.id for s in sessions]
        session_map = {s.id: s for s in sessions}
        
        stmt = (
            select(User, StudentSessionDetail, AttendanceRecord.session_id)
            .join(AttendanceRecord, User.id == AttendanceRecord.student_id)
            .join(StudentSessionDetail, AttendanceRecord.id == StudentSessionDetail.attendance_id)
            .where(AttendanceRecord.session_id.in_(session_ids))
            .order_by(StudentSessionDetail.submitted_time)
        )
        
        res = await session.execute(stmt)
        records = res.all()
        
        grouped_feedbacks = {}
        for user_obj, feedback, sess_id in records:
            if sess_id not in grouped_feedbacks:
                grouped_feedbacks[sess_id] = []
            grouped_feedbacks[sess_id].append({
                "student_name": user_obj.profile.name if user_obj.profile else "Unknown",
                "campus_id": user_obj.campus_id,
                "course": user_obj.profile.course if user_obj.profile else "N/A",
                "interactive_rating": feedback.interactive_rating,
                "relevant_rating": feedback.relevant_rating,
                "learned_today": feedback.learned_today,
                "key_takeaway": feedback.key_takeaway,
                "overall_satisfaction": feedback.overall_satisfaction,
                "submitted_time": feedback.submitted_time
            })
            
        print("Done group")
        
asyncio.run(run())
