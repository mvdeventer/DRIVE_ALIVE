"""Company-scoped authorization.

This is the counterpart to ``middleware/admin.py``, and the two must not be
confused:

* ``require_admin`` — the platform operator. Global. Gates every ``/admin/*``
  route including Reset Database, Backup and Restore.
* ``require_company_admin`` — a driving school's own administrator. Scoped to
  exactly one company and has no platform powers whatsoever.

``require_admin`` authorizes by exact equality against ``UserRole.ADMIN``, so
``COMPANY_ADMIN`` is refused there by construction — see
``tests/test_require_admin_boundary.py``.

**The scoping rule:** routes must take the company id from
``CompanyContext.company_id`` returned here, never from a path, query or body
parameter. Accepting a caller-supplied company id would let any school
administrator act on another school's records.
"""

from dataclasses import dataclass
from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.company import Company
from ..models.company_admin import CompanyAdmin
from ..models.user import User, UserStatus
from ..routes.auth import get_current_user


@dataclass(frozen=True)
class CompanyContext:
    """The authenticated administrator and the single company they may act on."""

    user: User
    company_id: int
    company: Company
    is_primary: bool


async def require_company_admin(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> CompanyContext:
    """Resolve the caller's company administrator context.

    Authorization is by profile row, not by ``User.role`` — the same way
    instructor and student access is resolved. A user who holds several
    profiles is a company admin here regardless of which role they logged in
    as; the route surface is what limits them.

    Raises:
        HTTPException: 403 if the caller administers no company, their account
            is not active, or their company has been deactivated.
    """
    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COMPANY_ADMIN_ACCOUNT_INACTIVE",
                "message": "This account is not active.",
            },
        )

    profile = (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.user_id == current_user.id)
        .first()
    )
    if profile is None:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COMPANY_ADMIN_REQUIRED",
                "message": "You do not administer a driving school.",
            },
        )

    company = db.query(Company).filter(Company.id == profile.company_id).first()
    if company is None or not company.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "COMPANY_INACTIVE",
                "message": "This driving school is no longer active.",
            },
        )

    return CompanyContext(
        user=current_user,
        company_id=company.id,
        company=company,
        is_primary=bool(profile.is_primary),
    )
