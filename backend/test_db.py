import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.user import User
from app.models.rbac import Role

async def run():
    async with AsyncSessionLocal() as session:
        stmt = select(User).join(Role, User.role_id == Role.id).where(Role.name.ilike('student'))
        res = await session.execute(stmt)
        print('Students:', len(res.scalars().all()))

asyncio.run(run())
