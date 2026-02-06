"""
Instructor Verification Token Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean, ForeignKey
from sqlalchemy.orm import relationship
from datetime import datetime, timezone
from ..database import Base


class InstructorVerificationToken(Base):
    """Model for instructor verification tokens sent to admins"""
    __tablename__ = "instructor_verification_tokens"

    id = Column(Integer, primary_key=True, index=True)
    instructor_id = Column(Integer, ForeignKey("instructors.id", ondelete="CASCADE"), nullable=False)
    token = Column(String, unique=True, nullable=False, index=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    verified_at = Column(DateTime(timezone=True), nullable=True)
    verified_by_admin_id = Column(Integer, ForeignKey("users.id"), nullable=True)  # Which admin verified
    is_used = Column(Boolean, default=False)
    created_at = Column(DateTime(timezone=True), default=lambda: datetime.now(timezone.utc))

    # Relationships
    instructor = relationship("Instructor", back_populates="verification_tokens")
    verified_by_admin = relationship("User", foreign_keys=[verified_by_admin_id])
