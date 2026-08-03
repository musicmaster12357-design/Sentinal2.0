from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
from app.models.user import User
from app.models.security import RefreshToken, Session
from app.core.jwt import create_access_token
from datetime import datetime, timedelta, timezone
import secrets
from fastapi import HTTPException

class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def authenticate_user(self, email: str, password_hash: str) -> User:
        # We assume password check happens at route level or here. 
        # Passlib context should be moved here or kept at route level.
        pass

    async def create_tokens(self, user: User, device_info: dict, ip_address: str):
        # Create access token
        access_token = create_access_token(
            data={"sub": str(user.id), "role": user.role.name if user.role else "student"},
            expires_delta=timedelta(minutes=15)
        )

        # Create refresh token
        refresh_token_str = secrets.token_urlsafe(32)
        expires_at = datetime.now(timezone.utc) + timedelta(days=7)
        
        refresh_token = RefreshToken(
            user_id=user.id,
            token=refresh_token_str,
            expires_at=expires_at
        )
        self.db.add(refresh_token)

        # Create session
        new_session = Session(
            user_id=user.id,
            ip_address=ip_address,
            user_agent=device_info.get("user_agent"),
            is_active=True
        )
        self.db.add(new_session)

        # Update last login
        user.last_login = datetime.now(timezone.utc)

        await self.db.commit()

        return {
            "access_token": access_token,
            "refresh_token": refresh_token_str,
            "token_type": "bearer"
        }

    async def refresh_access_token(self, refresh_token_str: str):
        result = await self.db.execute(
            select(RefreshToken).filter(RefreshToken.token == refresh_token_str)
        )
        token_obj = result.scalars().first()
        
        if not token_obj or token_obj.revoked:
            raise HTTPException(status_code=401, detail="Invalid refresh token")
            
        if token_obj.expires_at < datetime.now(timezone.utc):
            raise HTTPException(status_code=401, detail="Refresh token expired")

        # Create new access token
        # To get role safely, we need user object
        user = await self.db.get(User, token_obj.user_id)
        if not user or user.status != "active":
            raise HTTPException(status_code=401, detail="User inactive")

        # In a real app we would load the role explicitly
        access_token = create_access_token(
            data={"sub": str(user.id), "role": "resolved_role"}, 
            expires_delta=timedelta(minutes=15)
        )

        return {"access_token": access_token, "token_type": "bearer"}
