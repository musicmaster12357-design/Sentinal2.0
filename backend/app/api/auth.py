from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.database import get_db
from app.schemas.user import UserLogin, Token, ActivateRequest
from app.models.faculty import Faculty
from app.models.student import Student
from passlib.context import CryptContext
from app.security.jwt_handler import create_access_token
from fastapi.security import OAuth2PasswordBearer
from app.dependencies import get_current_student, TokenData

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

def verify_password(plain_password, hashed_password):
    if not hashed_password:
        return False
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, db: AsyncSession = Depends(get_db)):
    # Try Faculty first
    stmt = select(Faculty).where(Faculty.email == credentials.email)
    res = await db.execute(stmt)
    faculty = res.scalars().first()
    
    if faculty and verify_password(credentials.password, faculty.password_hash):
        access_token = create_access_token(data={"sub": faculty.email, "role": "faculty", "user_id": faculty.id})
        return {"access_token": access_token, "token_type": "bearer"}
        
    # Try Student next
    stmt = select(Student).where(Student.email == credentials.email)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if student and verify_password(credentials.password, student.password_hash):
        access_token = create_access_token(data={"sub": student.email, "role": "student", "user_id": student.id})
        return {"access_token": access_token, "token_type": "bearer"}
        
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Invalid email or password",
        headers={"WWW-Authenticate": "Bearer"},
    )


from app.schemas.user import StudentRegister

@router.post("/register/student")
async def register_student(data: StudentRegister, db: AsyncSession = Depends(get_db)):
    # Check if email is already taken by an active student
    stmt = select(Student).where(Student.email == data.email, Student.status == "active")
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    stmt = select(Student).where(Student.campus_id == data.campus_id)
    res = await db.execute(stmt)
    existing_student = res.scalars().first()
    
    if existing_student:
        if existing_student.status == "active":
            raise HTTPException(status_code=400, detail="Campus ID already registered")
        else:
            # Update the pending student
            # Do NOT update existing_student.name so the faculty's seeded name is preserved
            existing_student.email = data.email
            existing_student.password_hash = get_password_hash(data.password)
            existing_student.department = data.department
            existing_student.course = data.course
            existing_student.specialisation = data.specialisation
            existing_student.semester = data.semester
            existing_student.phone = data.phone
            existing_student.status = "active"
            student_to_use = existing_student
    else:
        new_student = Student(
            name=data.name,
            email=data.email,
            campus_id=data.campus_id,
            password_hash=get_password_hash(data.password),
            department=data.department,
            course=data.course,
            specialisation=data.specialisation,
            semester=data.semester,
            phone=data.phone,
            status="active"
        )
        db.add(new_student)
        student_to_use = new_student
        
    await db.commit()
    await db.refresh(student_to_use)
    
    # Auto-login
    access_token = create_access_token(data={"sub": student_to_use.email, "role": "student", "user_id": student_to_use.id})
    return {"access_token": access_token, "token_type": "bearer"}

@router.post("/activate")
async def activate_account(req: ActivateRequest, db: AsyncSession = Depends(get_db)):
    stmt = select(Student).where(Student.activation_token == req.token)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        raise HTTPException(status_code=400, detail="Invalid activation token")
        
    if student.is_activated:
        raise HTTPException(status_code=400, detail="Account is already activated")
        
    student.password_hash = get_password_hash(req.password)
    student.is_activated = True
    student.activation_token = None
    
    await db.commit()
    return {"message": "Account activated successfully"}

@router.get("/profile/me")
async def get_profile(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    from app.security.jwt_handler import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")
    
    email = payload.get("sub")
    role = payload.get("role")
    
    if role == "faculty":
        stmt = select(Faculty).where(Faculty.email == email)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if user:
            return {"id": user.id, "name": user.name, "email": user.email, "role": "faculty", "department": user.department}
            
    if role == "student":
        stmt = select(Student).where(Student.email == email)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if user:
            return {
                "id": user.id, "name": user.name, "email": user.email, 
                "role": "student", "department": user.department,
                "course": user.course, "specialisation": user.specialisation, "semester": user.semester,
                "campus_id": user.campus_id, "phone": getattr(user, 'phone', None)
            }
            
    raise HTTPException(status_code=404, detail="User not found")
@router.get("/lookup/student/{campus_id}")
async def lookup_student(campus_id: str, db: AsyncSession = Depends(get_db)):
    stmt = select(Student).where(Student.campus_id == campus_id)
    res = await db.execute(stmt)
    student = res.scalars().first()
    if not student:
        raise HTTPException(status_code=404, detail="Student not found")
    
    return {
        "name": student.name,
        "department": student.department,
        "course": student.course,
        "specialisation": student.specialisation,
        "status": student.status
    }

from app.schemas.user import ForgotPasswordRequest
from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    # We only handle Student password resets this way
    stmt = select(Student).where(Student.email == data.email)
    res = await db.execute(stmt)
    student = res.scalars().first()
    
    if not student:
        # Don't reveal if user exists or not for security
        return {"message": "If that email is registered, your password has been reset to your Campus ID."}
        
    # Instantly reset to Campus ID
    student.password_hash = get_password_hash(student.campus_id)
    await db.commit()
    
    return {"message": "If that email is registered, your password has been reset to your Campus ID."}

@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    from app.security.jwt_handler import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    email = payload.get("sub")
    role = payload.get("role")
    
    user = None
    if role == "faculty":
        res = await db.execute(select(Faculty).where(Faculty.email == email))
        user = res.scalars().first()
    elif role == "student":
        res = await db.execute(select(Student).where(Student.email == email))
        user = res.scalars().first()
        
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
        
    if not verify_password(data.old_password, user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    user.password_hash = get_password_hash(data.new_password)
    await db.commit()
    
    return {"message": "Password updated successfully"}

from app.schemas.user import UserProfileUpdate

@router.put("/profile/me")
async def update_profile(data: UserProfileUpdate, token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    from app.security.jwt_handler import verify_token
    payload = verify_token(token)
    if not payload:
        raise HTTPException(status_code=401, detail="Invalid token")
        
    email = payload.get("sub")
    role = payload.get("role")
    
    if role == "faculty":
        res = await db.execute(select(Faculty).where(Faculty.email == email))
        user = res.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if data.name: user.name = data.name
        if data.department: user.department = data.department
        # Faculty don't have course, specialisation, semester, phone in schema
        
    elif role == "student":
        res = await db.execute(select(Student).where(Student.email == email))
        user = res.scalars().first()
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
            
        if data.name: user.name = data.name
        if data.department: user.department = data.department
        if data.course: user.course = data.course
        if data.specialisation: user.specialisation = data.specialisation
        if data.semester: user.semester = data.semester
        if data.phone: user.phone = data.phone
        
    await db.commit()
    
    # Return updated profile using the existing logic (to keep it DRY, we just re-fetch basically, or manually build dict)
    if role == "faculty":
        return {"id": user.id, "name": user.name, "email": user.email, "role": "faculty"}
    elif role == "student":
         return {
             "id": user.id, "name": user.name, "email": user.email, 
             "role": "student", "department": user.department,
             "course": user.course, "specialisation": user.specialisation, "semester": user.semester,
             "campus_id": user.campus_id, "phone": getattr(user, 'phone', None)
         }

