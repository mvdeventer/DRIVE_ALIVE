"""
Application configuration module
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Database
    DATABASE_URL: str

    # JWT
    SECRET_KEY: str
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    # Firebase
    FIREBASE_CREDENTIALS_PATH: str = ""

    # Stripe
    STRIPE_SECRET_KEY: str = ""
    STRIPE_PUBLISHABLE_KEY: str = ""
    STRIPE_WEBHOOK_SECRET: str = ""

    # PayFast
    PAYFAST_MERCHANT_ID: str = ""
    PAYFAST_MERCHANT_KEY: str = ""
    PAYFAST_PASSPHRASE: str = ""
    PAYFAST_MODE: str = "sandbox"

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = True
    ALLOWED_ORIGINS: str = "http://localhost:3000"
    AUTO_VERIFY_INSTRUCTORS: bool = True  # Set to False in production

    # South Africa
    DEFAULT_TIMEZONE: str = "Africa/Johannesburg"
    DEFAULT_CURRENCY: str = "ZAR"

    @property
    def origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    class Config:
        env_file = "../.env"  # Look in parent directory (backend/)
        env_file_encoding = "utf-8"
        case_sensitive = True


# Load settings
import os
from pathlib import Path

# Try multiple paths for .env file
possible_env_paths = [
    Path(__file__).parent.parent / ".env",  # backend/.env
    Path(__file__).parent.parent.parent / ".env",  # root/.env
]

settings = None
for env_path in possible_env_paths:
    if env_path.exists():
        settings = Settings(_env_file=str(env_path))
        break

if settings is None:
    settings = Settings()  # Will use environment variables
