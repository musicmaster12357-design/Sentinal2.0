from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.core.config import settings
from app.database import engine, Base, AsyncSessionLocal
from app.models.user import User
from app.models.rbac import Role
from sqlalchemy.future import select

app = FastAPI(
    title="Smart Classroom Attendance Management System (SCAMS)",
    description="Backend API for SCAMS - Phase 2 IAM",
    version="2.0.0",
)

@app.on_event("startup")
async def startup_event():
    # Database migration happens via Alembic, but we can seed the super admin here
    async with AsyncSessionLocal() as db:
        # Create Super Admin Role if not exists
        stmt = select(Role).where(Role.name == "Super Admin")
        result = await db.execute(stmt)
        admin_role = result.scalars().first()
        if not admin_role:
            admin_role = Role(name="Super Admin")
            db.add(admin_role)
            await db.commit()
            await db.refresh(admin_role)

        # Create admin user
        stmt = select(User).where(User.email == "faculty@test.com")
        result = await db.execute(stmt)
        if not result.scalars().first():
            from app.api.auth import get_password_hash
            hashed_password = get_password_hash("SCAMS@yenepoya!")
            new_admin = User(
                email="faculty@test.com",
                campus_id="ADMIN001",
                password_hash=hashed_password,
                role_id=admin_role.id,
                status="active"
            )
            db.add(new_admin)
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

from app.api import auth, attendance, session, analytics, matrix, users, students
from app.websocket import attendance_socket

app.include_router(auth.router)
app.include_router(users.router)
app.include_router(students.router)
app.include_router(attendance.router)
app.include_router(session.router)
app.include_router(analytics.router)
app.include_router(matrix.router)
app.include_router(attendance_socket.router)

@app.get("/")
async def root():
    return {"message": "Welcome to SCAMS API Phase 2"}
