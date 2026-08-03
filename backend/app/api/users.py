from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.schemas.user import UserProfileUpdate, UserResponse
from app.models.user import User, Profile
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/users", tags=["users"])

@router.get("/me", response_model=UserResponse)
async def get_my_profile(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.profile), selectinload(User.role)).filter(User.id == current_user.id)
    )
    user = result.scalars().first()
    
    return {
        "id": user.id,
        "uuid": user.uuid,
        "campus_id": user.campus_id,
        "email": user.email,
        "status": user.status,
        "role": user.role.name if user.role else "unknown",
        "name": user.profile.name if user.profile else "",
        "phone": user.profile.phone if user.profile else "",
        "department": user.profile.department_name if user.profile else "",
        "course": user.profile.course_name if user.profile else "",
        "specialisation": user.profile.specialisation if user.profile else "",
        "semester": user.profile.semester_name if user.profile else "",
        "profile": user.profile
    }

@router.put("/me")
async def update_my_profile(data: UserProfileUpdate, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Profile).where(Profile.user_id == current_user.id))
    profile = result.scalars().first()
    
    if not profile:
        profile = Profile(user_id=current_user.id)
        db.add(profile)
        
    if data.name is not None:
        profile.name = data.name
    if data.phone is not None:
        profile.phone = data.phone
    if data.department is not None:
        profile.department_name = data.department
    if data.course is not None:
        profile.course_name = data.course
    if data.specialisation is not None:
        profile.specialisation = data.specialisation
    if data.semester is not None:
        profile.semester_name = data.semester
        
    await db.commit()
    return {"message": "Profile updated successfully"}
