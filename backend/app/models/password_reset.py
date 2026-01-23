"""
Password Reset Token Model
"""

from datetime import datetime, timedelta, timezone
from uuid import uuid4

from sqlalchemy import Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class PasswordResetToken(Base):
    """Password reset token for forgot password functionality"""

    __tablename__ = "password_reset_tokens"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    token = Column(String, unique=True, index=True, nullable=False)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    used_at = Column(DateTime(timezone=True), nullable=True)

    # Relationships
    user = relationship("User", back_populates="password_reset_tokens")

    @staticmethod
    def generate_token() -> str:
        """Generate a unique reset token"""
        return str(uuid4())

    @staticmethod
    def get_expiration_time() -> datetime:
        """Get token expiration time (1 hour from now)"""
        return datetime.now(timezone.utc) + timedelta(hours=1)

    def is_valid(self) -> bool:
        """Check if token is still valid (not expired and not used)"""
        now = datetime.now(timezone.utc)

        # Handle SQLite storing datetime as naive (without timezone)
        expires_at = self.expires_at
        if expires_at.tzinfo is None:
            # If stored datetime is naive, treat it as UTC
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return expires_at > now and self.used_at is None
