import os
from pydantic_settings import BaseSettings

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE_DIR, "scas.db")
# Windows paths have backslashes which can mess up sqlalchemy URL parsing.
DB_URL = f"sqlite+aiosqlite:///{DB_PATH.replace(os.sep, '/')}"

class Settings(BaseSettings):
    PROJECT_NAME: str = "AttendEase Backend"
    
    @property
    def get_database_url(self) -> str:
        url = os.environ.get("DATABASE_URL", DB_URL)
        if url.startswith("postgres://"):
            url = url.replace("postgres://", "postgresql+asyncpg://", 1)
        elif url.startswith("postgresql://"):
            url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
        return url
        
    DATABASE_URL: str = DB_URL # Fallback
    SECRET_KEY: str = "supersecretkey_change_in_production"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30
    QR_SECRET: str = "my_super_secret_qr_key_change_in_production"
    FRONTEND_URL: str = "http://localhost:5173"
    
    class Config:
        env_file = ".env"

settings = Settings()
