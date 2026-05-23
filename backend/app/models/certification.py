"""
Certification / Licence tracking model

Stores driver's licences, learner's permits, instructor PrDPs, K53 certs,
and any other credential a user might hold.
"""

import enum

from sqlalchemy import Column, Date, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from sqlalchemy import Enum as SQLEnum

from ..database import Base


class CertificationType(str, enum.Enum):
    """Type of certification / licence."""

    LEARNERS_LICENCE = "learners_licence"
    DRIVERS_LICENCE = "drivers_licence"
    PRDP = "prdp"                          # Professional Driving Permit
    K53_INSTRUCTOR = "k53_instructor"      # K53 driving instructor cert
    DEFENSIVE_DRIVING = "defensive_driving"
    FIRST_AID = "first_aid"
    OTHER = "other"


class Certification(Base):
    """A certification or licence held by a user."""

    __tablename__ = "certifications"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )
    cert_type = Column(SQLEnum(CertificationType), nullable=False, index=True)
    cert_code = Column(String(20), nullable=True)         # e.g. 'B', 'EC1', 'C1'
    number = Column(String(100), nullable=True)
    issuing_authority = Column(String(150), nullable=True)
    issued_date = Column(Date, nullable=True)
    expiry_date = Column(Date, nullable=True, index=True)
    notes = Column(Text, nullable=True)

    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    user = relationship("User", back_populates="certifications")
