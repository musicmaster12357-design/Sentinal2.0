from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Smart Classroom Attendance Management System (SCAMS)",
    description="Backend API for SCAMS",
    version="1.0.0",
)

from app.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models.faculty import Faculty
from passlib.context import CryptContext
from sqlalchemy.future import select

@app.on_event("startup")
async def startup_event():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
        
    async with AsyncSessionLocal() as db:
        stmt = select(Faculty).where(Faculty.email == "faculty@test.com")
        result = await db.execute(stmt)
        if not result.scalars().first():
            from app.api.auth import get_password_hash
            hashed_password = get_password_hash("SCAMS@yenepoya!")
            new_faculty = Faculty(
                name="Test Faculty",
                email="faculty@test.com",
                password_hash=hashed_password,
                department="Computer Science"
            )
            db.add(new_faculty)
            await db.commit()

# CORS configuration
origins = [
    "*",
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=False,
    allow_methods=["*"],
    allow_headers=["*"],
)

from app.api import auth, attendance, session, analytics, matrix, students
from app.websocket import attendance_socket

app.include_router(auth.router)
app.include_router(attendance.router)
app.include_router(session.router)
app.include_router(analytics.router)
app.include_router(matrix.router)
app.include_router(students.router)
app.include_router(attendance_socket.router)

@app.get("/")
async def root():
    return {"message": "Welcome to SCAMS API"}
