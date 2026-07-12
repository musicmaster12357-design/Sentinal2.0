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
    stmt = select(Student).where(Student.email == data.email)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    stmt = select(Student).where(Student.campus_id == data.campus_id)
    res = await db.execute(stmt)
    if res.scalars().first():
        raise HTTPException(status_code=400, detail="Campus ID already registered")
        
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
    await db.commit()
    await db.refresh(new_student)
    
    # Auto-login
    access_token = create_access_token(data={"sub": new_student.email, "role": "student", "user_id": new_student.id})
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
            return {"id": user.id, "name": user.name, "email": user.email, "role": "faculty"}
            
    if role == "student":
        stmt = select(Student).where(Student.email == email)
        res = await db.execute(stmt)
        user = res.scalars().first()
        if user:
            return {
                "id": user.id, "name": user.name, "email": user.email, 
                "role": "student", "department": user.department,
                "course": user.course, "specialisation": user.specialisation, "semester": user.semester,
                "campus_id": user.campus_id
            }
            
    raise HTTPException(status_code=404, detail="User not found")
