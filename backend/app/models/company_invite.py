"""Instructor recruitment between a driving school and an instructor.

One table serves both directions, distinguished by ``direction``:

* ``invite``  — a school invites an instructor, who accepts or declines;
* ``request`` — an instructor asks to join a school, which accepts or declines.

Both end in the same place: the instructor's ``company_id`` is set and the
school's proposed markup is applied. Keeping them in one table means one state
machine, one expiry sweep and one audit trail rather than two of each.

The "an instructor belongs to at most one school" rule is not enforced here.
``Instructor.company_id`` is a single-valued column, so it is structurally
impossible to hold two; the acceptance path re-checks that it is still free
inside the transaction.
"""

import enum
import secrets
from datetime import datetime, timedelta, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base

#: How long an unanswered invitation stands before the sweeper expires it.
INVITE_VALIDITY_DAYS = 7


class InviteDirection(str, enum.Enum):
    """Who started the conversation."""

    INVITE = "invite"  # school → instructor
    REQUEST = "request"  # instructor → school


class InviteStatus(str, enum.Enum):
    PENDING = "pending"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    REVOKED = "revoked"
    EXPIRED = "expired"


class CompanyInstructorInvite(Base):
    """A pending or settled offer of membership between a school and an instructor."""

    __tablename__ = "company_instructor_invites"

    id = Column(Integer, primary_key=True, index=True)

    company_id = Column(
        Integer, ForeignKey("companies.id", ondelete="CASCADE"), nullable=False, index=True
    )
    invited_by_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    direction = Column(String(10), nullable=False, default=InviteDirection.INVITE.value)

    # The invitee may have no account yet, so the email is the durable handle
    # and instructor_id is filled in once we know who they are.
    email = Column(String(255), nullable=False, index=True)
    instructor_id = Column(
        Integer, ForeignKey("instructors.id", ondelete="CASCADE"), nullable=True, index=True
    )

    token = Column(String(200), unique=True, nullable=False, index=True)
    status = Column(String(20), nullable=False, default=InviteStatus.PENDING.value, index=True)

    # The deal on offer, so an instructor can see the terms before accepting.
    proposed_markup_type = Column(String(10), nullable=True)
    proposed_markup_value = Column(Float, nullable=False, default=0.0)

    expires_at = Column(DateTime(timezone=True), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    responded_at = Column(DateTime(timezone=True), nullable=True)

    company = relationship("Company", foreign_keys=[company_id])
    instructor = relationship("Instructor", foreign_keys=[instructor_id])

    # ── Token helpers ─────────────────────────────────────────────────────
    # Mirrors PasswordResetToken so there is one token idiom in the codebase.

    @staticmethod
    def generate_token() -> str:
        """A cryptographically secure invite token (256-bit entropy)."""
        return secrets.token_urlsafe(32)

    @staticmethod
    def get_expiration_time() -> datetime:
        """When an invitation created now should lapse."""
        return datetime.now(timezone.utc) + timedelta(days=INVITE_VALIDITY_DAYS)

    def is_valid(self) -> bool:
        """Still open: pending, and not yet lapsed."""
        now = datetime.now(timezone.utc)

        # SQLite stores datetimes without a timezone; treat those as UTC rather
        # than letting the comparison raise.
        expires_at = self.expires_at
        if expires_at is not None and expires_at.tzinfo is None:
            expires_at = expires_at.replace(tzinfo=timezone.utc)

        return self.status == InviteStatus.PENDING.value and expires_at > now
