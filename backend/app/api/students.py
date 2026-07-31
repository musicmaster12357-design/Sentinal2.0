from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.dependencies import get_current_faculty
from app.models.student import Student
from pydantic import BaseModel
from typing import Optional
from passlib.context import CryptContext

router = APIRouter(prefix="/api/students", tags=["students"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

class StudentUpdate(BaseModel):
    name: Optional[str] = None
    campus_id: Optional[str] = None
    email: Optional[str] = None
    course: Optional[str] = None
    specialisation: Optional[str] = None
    password: Optional[str] = None

class StudentCreate(BaseModel):
    name: str
    campus_id: str
    email: Optional[str] = None
    course: Optional[str] = "BCA"
    specialisation: Optional[str] = None
    password: Optional[str] = None

@router.post("")
async def create_student(data: StudentCreate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_faculty)):
    stmt = select(Student).where(Student.campus_id == data.campus_id)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Campus ID already exists")
        
    email = data.email or f"{data.campus_id}@pending.local"
    new_student = Student(
        name=data.name,
        campus_id=data.campus_id,
        email=email,
        password_hash=pwd_context.hash(data.password if data.password else "password123"),
        course=data.course,
        specialisation=data.specialisation,
        status="pending"
    )
    db.add(new_student)
    await db.commit()
    await db.refresh(new_student)
    
    return {"message": "Student created successfully", "student": {
        "id": new_student.id,
        "name": new_student.name,
        "campus_id": new_student.campus_id,
        "email": new_student.email,
        "course": new_student.course,
        "specialisation": new_student.specialisation,
        "status": new_student.status
    }}

@router.get("")
async def get_all_students(db: AsyncSession = Depends(get_db), current_user=Depends(get_current_faculty)):
    stmt = select(Student)
    res = await db.execute(stmt)
    students = res.scalars().all()
    
    return {"students": [{
        "id": s.id,
        "name": s.name,
        "campus_id": s.campus_id,
        "email": s.email,
        "course": s.course,
        "specialisation": s.specialisation,
        "status": s.status
    } for s in students]}

@router.put("/{student_id}")
async def update_student(student_id: int, data: StudentUpdate, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_faculty)):
    stmt = select(Student).where(Student.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if data.name: student.name = data.name
    if data.campus_id: student.campus_id = data.campus_id
    if data.email: student.email = data.email
    if data.course: student.course = data.course
    if data.specialisation: student.specialisation = data.specialisation
    if data.password: student.password_hash = pwd_context.hash(data.password)
    
    await db.commit()
    return {"message": "Student updated"}

@router.delete("/{student_id}")
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_faculty)):
    stmt = select(Student).where(Student.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    await db.delete(student)
    await db.commit()
    return {"message": "Student deleted"}

@router.post("/{student_id}/reset-password")
async def reset_password(student_id: int, db: AsyncSession = Depends(get_db), current_user=Depends(get_current_faculty)):
    stmt = select(Student).where(Student.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.password_hash = pwd_context.hash("password123")
    await db.commit()
    return {"message": "Password reset to password123"}
