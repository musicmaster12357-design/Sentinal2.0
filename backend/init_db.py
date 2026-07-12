import asyncio
from app.database import engine, Base
from app.models import student, faculty, session, attendance

async def main():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
        await conn.run_sync(Base.metadata.create_all)
    print("Database recreated.")

if __name__ == "__main__":
    asyncio.run(main())
