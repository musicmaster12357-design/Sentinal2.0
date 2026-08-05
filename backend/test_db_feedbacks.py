import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User, Profile
from app.models.attendance import AttendanceRecord
from app.models.student_session_detail import StudentSessionDetail
from app.models.session import AttendanceSession

async def run():
    async with AsyncSessionLocal() as session:
        current_user = (await session.execute(select(User).where(User.email == 'faculty@test.com'))).scalars().first()
        
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
            StudentSessionDetail.overall_satisfaction > 0
        ).order_by(StudentSessionDetail.submitted_time.desc())

        res = await session.execute(stmt)
        records = res.all()
        
        print(f"Got {len(records)} records")
        
        for r, s, d, sess, p in records:
            print(p.name if p else 'N/A', s.email)

asyncio.run(run())
