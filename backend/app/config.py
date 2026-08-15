"""
Application configuration module
"""

from typing import List

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    """Application settings"""

    # Brand / white-label identity. Set by scripts/rename_app.py during
    # install or any time via backend/.env. A single source of truth that
    # services and the frontend (via /api/config/branding) read at runtime.
    APP_NAME: str = "Driving School"
    APP_DOMAIN: str = "localhost"
    APP_SLUG: str = "drivingschool"
    APP_BUNDLE_ID: str = "com.drivingschool.app"

    # Database – optional so the server can start without a configured DB
    # (first-run wizard writes the real URL to .env)
    DATABASE_URL: str = "not_configured"

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

    # Provider selectors (consumed by services/gateways + services/notifiers
    # factories). Empty string → factory picks a sensible default based on
    # which credentials are configured.
    PAYMENT_PROVIDER: str = ""  # "stripe" | "mock" | "payfast"
    EMAIL_PROVIDER: str = ""  # "smtp" (default); "ses" / "postmark" planned
    WHATSAPP_PROVIDER: str = ""  # "twilio" (default); "meta_cloud" planned

    # Twilio
    TWILIO_ACCOUNT_SID: str = ""
    TWILIO_AUTH_TOKEN: str = ""
    TWILIO_WHATSAPP_NUMBER: str = ""

    # SMTP Email Configuration
    SMTP_SERVER: str = "smtp.gmail.com"
    SMTP_PORT: int = 587
    SMTP_USERNAME: str = ""
    SMTP_PASSWORD: str = ""
    FROM_EMAIL: str = "noreply@roadready.co.za"
    UNSUBSCRIBE_EMAIL: str = "unsubscribe@roadready.co.za"

    # Encryption (for sensitive data like SMTP passwords)
    ENCRYPTION_KEY: str = ""

    # Mock payments — must be explicitly opted into; never auto-enabled in production
    ALLOW_MOCK_PAYMENTS: bool = False

    # Frontend URL (for verification links, password reset, payment redirects)
    # Development: http://localhost:8081
    # Home Network: http://<your-computer-ip>:8081 (for mobile testing)
    # Production: https://<your-render-app>.onrender.com
    FRONTEND_URL: str = "http://localhost:8081"

    # App
    ENVIRONMENT: str = "development"
    DEBUG: bool = False
    ALLOWED_ORIGINS: str = (
        "http://localhost:3000,http://localhost:8081,http://localhost:19000"
    )
    AUTO_VERIFY_INSTRUCTORS: bool = (
        False  # Only True in debug mode (controlled by DEBUG)
    )

    # Rate limiting (Redis)
    REDIS_URL: str = ""
    RATE_LIMIT_ENABLED: bool = True

    # Sentry error monitoring (optional — leave blank to disable)
    SENTRY_DSN: str = ""
    SENTRY_TRACES_SAMPLE_RATE: float = 0.05  # 5% trace sampling in production

    # South Africa
    DEFAULT_TIMEZONE: str = "Africa/Johannesburg"
    DEFAULT_CURRENCY: str = "ZAR"

    def validate_production_secrets(self) -> None:
        """Raise RuntimeError if critical secrets are missing in production."""
        if self.ENVIRONMENT != "production":
            return
        errors = []
        if not self.SECRET_KEY or len(self.SECRET_KEY) < 32:
            errors.append("SECRET_KEY must be set and at least 32 characters in production")
        if not self.ENCRYPTION_KEY:
            errors.append("ENCRYPTION_KEY must be set in production")
        if not self.STRIPE_SECRET_KEY and not self.ALLOW_MOCK_PAYMENTS:
            errors.append("STRIPE_SECRET_KEY must be set in production (or set ALLOW_MOCK_PAYMENTS=true)")
        if self.STRIPE_SECRET_KEY and not self.STRIPE_WEBHOOK_SECRET:
            errors.append("STRIPE_WEBHOOK_SECRET must be set when STRIPE_SECRET_KEY is configured")
        if self.DEBUG:
            errors.append("DEBUG must be False in production")
        if errors:
            raise RuntimeError("Production configuration errors:\n" + "\n".join(f"  • {e}" for e in errors))

    @property
    def origins_list(self) -> List[str]:
        """Parse ALLOWED_ORIGINS into list"""
        return [origin.strip() for origin in self.ALLOWED_ORIGINS.split(",")]

    @property
    def should_auto_verify_instructors(self) -> bool:
        """Auto-verify instructors only in debug mode"""
        return self.DEBUG and self.AUTO_VERIFY_INSTRUCTORS

    class Config:
        env_file = "../.env"  # Look in parent directory (backend/)
        env_file_encoding = "utf-8"
        case_sensitive = True
        extra = "ignore"  # Silently ignore unknown .env keys so the server never fails to start


# Load settings
from pathlib import Path

# Both .env files are read, lowest priority first, so a key set in
# backend/.env wins over the same key in the repo root. This used to stop at
# the first file that existed, which meant anything written to the root .env
# was silently ignored whenever backend/.env was present.
env_paths_low_to_high = [
    Path(__file__).parent.parent.parent / ".env",  # root/.env
    Path(__file__).parent.parent / ".env",  # backend/.env
]

existing_env_paths = [str(p) for p in env_paths_low_to_high if p.exists()]

if existing_env_paths:
    settings = Settings(_env_file=tuple(existing_env_paths))
else:
    settings = Settings()  # Will use environment variables
