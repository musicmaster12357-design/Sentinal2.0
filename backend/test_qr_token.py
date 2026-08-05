import asyncio
from sqlalchemy import select
from app.database import AsyncSessionLocal
from app.models.session import AttendanceSession
async def run():
    async with AsyncSessionLocal() as db:
        res = await db.execute(select(AttendanceSession).order_by(AttendanceSession.id.desc()).limit(1))
        sess = res.scalars().first()
        print(sess.qr_token)
asyncio.run(run())
