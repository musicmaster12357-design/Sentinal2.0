import asyncio
from sqlalchemy.ext.asyncio import create_async_engine
from sqlalchemy import text
from app.core.config import settings

async def reset_db():
    print("Running database reset script...")
    url = settings.get_database_url
    # If SQLite, don't drop cascade
    is_sqlite = url.startswith("sqlite")
    
    engine = create_async_engine(url)
    async with engine.begin() as conn:
        tables = [
            "alembic_version",
            "student_session_details",
            "attendance",
            "attendance_sessions",
            "students",
            "faculty"
        ]
        
        for table in tables:
            try:
                if is_sqlite:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table}"))
                else:
                    await conn.execute(text(f"DROP TABLE IF EXISTS {table} CASCADE"))
                print(f"Dropped {table}")
            except Exception as e:
                print(f"Could not drop {table}: {e}")
                
if __name__ == "__main__":
    asyncio.run(reset_db())
