"""
Company model for instructor company membership
"""
import enum
from datetime import datetime

from sqlalchemy import Boolean, Column, DateTime, Float, ForeignKey, Integer, String
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
        Integer,
        ForeignKey(
            "instructors.id",
            ondelete="SET NULL",
            use_alter=True,
            name="fk_companies_owner_instructor_id",
        ),
        nullable=True,
    )

    # The person who administers this school. Distinct from
    # owner_instructor_id, which is the legacy instructor-owner model kept for
    # schools created before company administrators existed.
    owner_user_id = Column(
        Integer, ForeignKey("users.id", ondelete="SET NULL"), nullable=True
    )

    # A one-person business created automatically for an instructor who
    # registered independently. It exists so that every booking has a company
    # to bill — without it an independent would pay no commission at all — but
    # it is not a school: it has no staff to recruit and no margin to take, so
    # the roster and break-even rules do not apply to it.
    is_solo = Column(Boolean, default=False, nullable=False, index=True)

    # Exactly one company is the platform host: the operator that receives
    # commission from every other school. It never pays commission to itself.
    is_platform_host = Column(Boolean, default=False, nullable=False, index=True)

    # Platform revenue settings. Only meaningful on the host company; NULL
    # elsewhere means "use the platform default".
    platform_commission_percent = Column(Float, nullable=True)
    subscription_price_per_instructor = Column(Float, nullable=True)

    billing_email = Column(String(255), nullable=True)

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
    owner_user = relationship("User", foreign_keys=[owner_user_id])
