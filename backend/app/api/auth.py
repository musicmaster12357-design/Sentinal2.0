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
    from app.models.settings import SystemSettings
    setting = await db.execute(select(SystemSettings).where(SystemSettings.key == "registration_open"))
    setting_obj = setting.scalars().first()
    if setting_obj and setting_obj.value == "false":
        raise HTTPException(status_code=403, detail="Registration is currently closed by the administrator")

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

@router.get("/settings/registration")
async def get_registration_setting(db: AsyncSession = Depends(get_db)):
    from app.models.settings import SystemSettings
    setting = await db.execute(select(SystemSettings).where(SystemSettings.key == "registration_open"))
    setting_obj = setting.scalars().first()
    is_open = True
    if setting_obj and setting_obj.value == "false":
        is_open = False
    return {"registration_open": is_open}

@router.post("/settings/registration")
async def toggle_registration_setting(current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    # Only faculty/admin should toggle
    from app.models.rbac import Role
    role_stmt = select(Role).where(Role.id == current_user.role_id)
    role_res = await db.execute(role_stmt)
    role = role_res.scalars().first()
    
    if not role or role.name == "student":
        raise HTTPException(status_code=403, detail="Not authorized")
        
    from app.models.settings import SystemSettings
    setting = await db.execute(select(SystemSettings).where(SystemSettings.key == "registration_open"))
    setting_obj = setting.scalars().first()
    
    is_open = True
    if setting_obj:
        is_open = setting_obj.value != "false"
        setting_obj.value = "false" if is_open else "true"
        is_open = not is_open
    else:
        # Default is true, so first toggle makes it false
        setting_obj = SystemSettings(key="registration_open", value="false")
        db.add(setting_obj)
        is_open = False
        
    await db.commit()
    return {"registration_open": is_open}

from pydantic import BaseModel

class ChangePasswordRequest(BaseModel):
    old_password: str
    new_password: str

@router.post("/change-password")
async def change_password(data: ChangePasswordRequest, current_user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    if not verify_password(data.old_password, current_user.password_hash):
        raise HTTPException(status_code=400, detail="Incorrect current password")
        
    current_user.password_hash = get_password_hash(data.new_password)
    db.add(current_user)
    await db.commit()
    return {"message": "Password updated successfully"}

class ForgotPasswordRequest(BaseModel):
    email: str

@router.post("/forgot-password")
async def forgot_password(data: ForgotPasswordRequest, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.email == data.email))
    user = result.scalars().first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Email not found")
        
    # Reset password to campus_id
    user.password_hash = get_password_hash(user.campus_id)
    db.add(user)
    await db.commit()
    return {"message": "Password reset to Campus ID successfully"}
