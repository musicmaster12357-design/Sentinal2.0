from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.models.user import User, Profile
from app.models.rbac import Role
from app.core.permissions import get_current_user, RequirePermission
from app.api.auth import get_password_hash
from pydantic import BaseModel

router = APIRouter(prefix="/api/students", tags=["students"])

class StudentCreate(BaseModel):
    name: str
    campus_id: str
    email: str
    specialisation: str | None = None
    password: str | None = None

@router.get("")
async def get_all_students(db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Need to load the profile and role
    stmt = select(User).options(selectinload(User.profile), selectinload(User.role)).join(Role).where(Role.name.ilike('student'))
    res = await db.execute(stmt)
    students = res.scalars().all()
    
    return {"students": [{
        "id": s.id,
        "name": s.profile.name if s.profile else "Unknown",
        "email": s.email,
        "specialisation": "N/A",  
        "campus_id": s.campus_id,
        "status": s.status
    } for s in students]}

@router.post("")
async def add_student(data: StudentCreate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    # Check if email or campus_id exists
    stmt = select(User).where((User.email == data.email) | (User.campus_id == data.campus_id))
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Student with this email or campus ID already exists")

    # Get student role
    role_stmt = select(Role).where(Role.name.ilike('student'))
    role_res = await db.execute(role_stmt)
    student_role = role_res.scalars().first()
    if not student_role:
        raise HTTPException(status_code=500, detail="Student role not configured in DB")

    password = data.password if data.password else "password123"
    hashed_password = get_password_hash(password)

    new_user = User(
        email=data.email,
        campus_id=data.campus_id,
        password_hash=hashed_password,
        role_id=student_role.id,
        status="active"
    )
    db.add(new_user)
    await db.flush()

    new_profile = Profile(
        user_id=new_user.id,
        name=data.name
    )
    db.add(new_profile)
    await db.commit()

    return {"student": {
        "id": new_user.id,
        "name": new_profile.name,
        "email": new_user.email,
        "specialisation": "N/A",
        "campus_id": new_user.campus_id,
        "status": new_user.status
    }}

@router.delete("/{student_id}")
async def delete_student(student_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(User).where(User.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    await db.delete(student)
    await db.commit()
    return {"message": "Student deleted successfully"}


class StudentUpdate(BaseModel):
    name: str | None = None
    campus_id: str | None = None
    email: str | None = None
    specialisation: str | None = None
    password: str | None = None

@router.put("/{student_id}")
async def update_student(student_id: int, data: StudentUpdate, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(User).options(selectinload(User.profile)).where(User.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    if data.email:
        student.email = data.email
    if data.campus_id:
        student.campus_id = data.campus_id
    if data.password:
        student.password_hash = get_password_hash(data.password)
        
    if student.profile:
        if data.name:
            student.profile.name = data.name
        if data.specialisation:
            student.profile.specialisation = data.specialisation
            
    await db.commit()
    return {"message": "Student updated successfully"}

@router.post("/{student_id}/reset-password")
async def reset_password(student_id: int, db: AsyncSession = Depends(get_db), current_user: User = Depends(get_current_user)):
    stmt = select(User).where(User.id == student_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
        
    student.password_hash = get_password_hash("password123")
    await db.commit()
    return {"message": "Password reset to default (password123)"}
