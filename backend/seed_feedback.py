import asyncio
from sqlalchemy import select
from datetime import datetime, timezone, timedelta
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.session import AttendanceSession
from app.models.attendance import AttendanceRecord
from app.models.student_session_detail import StudentSessionDetail

async def run():
    async with AsyncSessionLocal() as session:
        # Get faculty
        fac_stmt = select(User).where(User.email == 'faculty@test.com')
        faculty = (await session.execute(fac_stmt)).scalars().first()
        
        # Get 5 students
        std_stmt = select(User).where(User.email != 'faculty@test.com').limit(5)
        students = (await session.execute(std_stmt)).scalars().all()
        
        if not faculty or not students:
            print('Missing faculty or students')
            return
            
        # Create a session
        now = datetime.now(timezone.utc)
        s = AttendanceSession(
            faculty_id=faculty.id,
            subject_id='CS101',
            start_time=now - timedelta(days=1),
            end_time=now - timedelta(days=1) + timedelta(hours=1),
            title='Test Session',
            time_slot='10:00-11:00',
            status='completed',
            is_active=False
        )
        session.add(s)
        await session.commit()
        await session.refresh(s)
        
        # Add attendance and feedback
        for i, std in enumerate(students):
            rec = AttendanceRecord(
                session_id=s.id,
                student_id=std.id,
                status='present',
                timestamp=now - timedelta(days=1) + timedelta(minutes=5+i)
            )
            session.add(rec)
            await session.commit()
            await session.refresh(rec)
            
            detail = StudentSessionDetail(
                attendance_id=rec.id,
                interactive_rating=4+i%2,
                relevant_rating=5,
                learned_today='A lot of cool stuff',
                key_takeaway='Web dev is awesome',
                overall_satisfaction=4+i%2,
                submitted_time=now - timedelta(days=1) + timedelta(minutes=50+i)
            )
            session.add(detail)
            
        await session.commit()
        print('Feedback seeded successfully')

asyncio.run(run())
