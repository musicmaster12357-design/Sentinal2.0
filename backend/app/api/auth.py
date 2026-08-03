from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from sqlalchemy.orm import selectinload
from app.database import get_db
from app.schemas.user import UserLogin, Token, RefreshRequest, UserCreate
from app.models.user import User, Profile
from app.models.rbac import Role
from passlib.context import CryptContext
from app.services.auth_service import AuthService
from app.dependencies import oauth2_scheme
from app.core.permissions import get_current_user

router = APIRouter(prefix="/api/auth", tags=["auth"])
pwd_context = CryptContext(schemes=["argon2"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

@router.post("/login", response_model=Token)
async def login(credentials: UserLogin, request: Request, db: AsyncSession = Depends(get_db)):
    result = await db.execute(
        select(User).options(selectinload(User.role)).filter(User.email == credentials.email)
    )
    user = result.scalars().first()
    
    if not user or not verify_password(credentials.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if user.status != "active":
        raise HTTPException(status_code=403, detail="Account is disabled or pending verification")

    auth_service = AuthService(db)
    
    device_info = {
        "user_agent": request.headers.get("user-agent", "Unknown")
    }
    ip_address = request.client.host if request.client else "Unknown"

    tokens = await auth_service.create_tokens(user, device_info, ip_address)
    return tokens

@router.post("/refresh", response_model=Token)
async def refresh_token(data: RefreshRequest, db: AsyncSession = Depends(get_db)):
    auth_service = AuthService(db)
    return await auth_service.refresh_access_token(data.refresh_token)

@router.post("/register")
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    # Check if email exists
    result = await db.execute(select(User).where(User.email == data.email))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Email already registered")
        
    result = await db.execute(select(User).where(User.campus_id == data.campus_id))
    if result.scalars().first():
        raise HTTPException(status_code=400, detail="Campus ID already registered")

    # Get Role
    result = await db.execute(select(Role).where(Role.name == data.role_name))
    role = result.scalars().first()
    if not role:
        # Default fallback for testing
        role = Role(name=data.role_name)
        db.add(role)
        await db.flush()

    new_user = User(
        email=data.email,
        campus_id=data.campus_id,
        password_hash=get_password_hash(data.password),
        role_id=role.id,
        status="active"
    )
    db.add(new_user)
    await db.flush()
    
    profile = Profile(
        user_id=new_user.id,
        name=data.name,
        phone=data.phone
    )
    db.add(profile)
    
    await db.commit()
    return {"message": "User registered successfully"}

@router.post("/logout")
async def logout(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # In a real system, we'd revoke the refresh token and mark the session inactive
    # For now, it's handled via client-side token deletion
    return {"message": "Logged out successfully"}
