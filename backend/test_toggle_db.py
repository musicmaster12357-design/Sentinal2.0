import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.settings import SystemSettings
from app.models.rbac import Role

async def run():
    async with AsyncSessionLocal() as session:
        current_user = (await session.execute(select(User).where(User.email == 'faculty@test.com'))).scalars().first()
        
        role_stmt = select(Role).where(Role.id == current_user.role_id)
        role_res = await session.execute(role_stmt)
        role = role_res.scalars().first()
        
        if not role or role.name == "student":
            print("Not authorized")
            return
            
        setting = await session.execute(select(SystemSettings).where(SystemSettings.key == "registration_open"))
        setting_obj = setting.scalars().first()
        
        print(f"Setting: {setting_obj}")

asyncio.run(run())
