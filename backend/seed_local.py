import asyncio
import httpx
from sqlalchemy import select
from passlib.context import CryptContext
from app.database import AsyncSessionLocal
from app.models.user import User, Profile
from app.models.rbac import Role

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

async def run():
    async with httpx.AsyncClient() as client:
        r = await client.post("https://sentinal20-production.up.railway.app/api/auth/login", json={"email": "faculty@test.com", "password": "SCAMS@yenepoya!"})
        token = r.json()["access_token"]
        r_students = await client.get("https://sentinal20-production.up.railway.app/api/students", headers={"Authorization": f"Bearer {token}"})
        live_students = r_students.json().get("students", [])
        
    async with AsyncSessionLocal() as session:
        # Get student role
        role_stmt = select(Role).where(Role.name.ilike('student'))
        role_res = await session.execute(role_stmt)
        student_role = role_res.scalars().first()
        if not student_role:
            print("Student role not found locally!")
            return
            
        for s in live_students:
            # Check if exists
            stmt = select(User).where(User.email == s['email'])
            res = await session.execute(stmt)
            if not res.scalars().first():
                u = User(
                    email=s['email'],
                    password_hash=pwd_context.hash("password123"),
                    role_id=student_role.id,
                    status="active",
                    campus_id=s['campus_id']
                )
                session.add(u)
                await session.commit()
                await session.refresh(u)
                
                p = Profile(
                    user_id=u.id,
                    name=s['name'],
                    course_name=s.get('specialisation') or 'Unknown',
                    specialisation=s.get('specialisation') or 'Unknown',
                    semester_name='1',
                    phone=s.get('phone')
                )
                session.add(p)
        
        await session.commit()
        print(f"Seeded {len(live_students)} students locally!")

asyncio.run(run())
