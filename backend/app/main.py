from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(
    title="Smart Classroom Attendance Management System (SCAMS)",
    description="Backend API for SCAMS",
    version="1.0.0",
)

from app.config import settings

# CORS configuration
origins = [
    settings.FRONTEND_URL,
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
