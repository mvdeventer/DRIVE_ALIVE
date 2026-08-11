"""Company administrator profile.

A company admin runs a driving school without teaching. This is deliberately a
profile table rather than a ``company_id`` column on ``User``:

* ``RoleTransitionPolicy._get_effective_roles`` resolves roles by looking for
  profile rows (``Student``, ``Instructor``), so a table keeps the new role
  consistent with how the other two are detected.
* ``Instructor.company_id`` already exists and means "the school this
  instructor teaches for". A second ``company_id`` on ``User`` would be a
  different relationship wearing the same name.

The platform-admin role (``UserRole.ADMIN``) stays global and is unrelated —
see ``middleware/company.py`` for the authorization boundary.
"""

from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..database import Base


class CompanyAdmin(Base):
    """Links a user to the company they administer."""

    __tablename__ = "company_admins"

    id = Column(Integer, primary_key=True, index=True)

    # Unique: a person administers at most one school. Not exclusive of other
    # profiles — the same user may also hold a Student or Instructor profile.
    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        unique=True,
        nullable=False,
        index=True,
    )
    company_id = Column(
        Integer,
        ForeignKey("companies.id", ondelete="CASCADE"),
        nullable=False,
        index=True,
    )

    # The founding admin, created with the company. Peers cannot remove them.
    is_primary = Column(Boolean, default=True, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    user = relationship("User", foreign_keys=[user_id])
    company = relationship("Company", foreign_keys=[company_id])
