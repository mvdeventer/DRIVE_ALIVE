"""
Company model for instructor company membership
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class Company(Base):
    """Driving school / instructor company"""

    __tablename__ = "companies"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(200), nullable=False)
    slug = Column(String(200), unique=True, nullable=False, index=True)

    # The instructor who created (owns) this company
    owner_instructor_id = Column(
        Integer, ForeignKey("instructors.id", ondelete="SET NULL"), nullable=True
    )

    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship(
        "Instructor",
        foreign_keys=[owner_instructor_id],
        back_populates="owned_company",
        uselist=False,
    )
    instructors = relationship(
        "Instructor",
        foreign_keys="Instructor.company_id",
        back_populates="company",
    )
