"""
Certification / Licence tracking routes
"""

from datetime import date
from typing import Annotated, List, Optional

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.certification import Certification
from ..models.user import User, UserRole
from ..routes.auth import get_current_user, get_active_role
from ..schemas.certification import (
    CertificationCreate,
    CertificationResponse,
    CertificationUpdate,
)

router = APIRouter(prefix="/certifications", tags=["Certifications"])


def _to_response(cert: Certification) -> CertificationResponse:
    """Attach computed expiry helpers to a Certification before serialization."""
    today = date.today()
    is_expired = bool(cert.expiry_date and cert.expiry_date < today)
    days_until_expiry: Optional[int] = None
    if cert.expiry_date:
        days_until_expiry = (cert.expiry_date - today).days
    return CertificationResponse(
        id=cert.id,
        user_id=cert.user_id,
        cert_type=cert.cert_type,
        cert_code=cert.cert_code,
        number=cert.number,
        issuing_authority=cert.issuing_authority,
        issued_date=cert.issued_date,
        expiry_date=cert.expiry_date,
        notes=cert.notes,
        created_at=cert.created_at,
        updated_at=cert.updated_at,
        is_expired=is_expired,
        days_until_expiry=days_until_expiry,
    )


@router.get("/me", response_model=List[CertificationResponse])
async def list_my_certifications(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """List all certifications belonging to the current user."""
    certs = (
        db.query(Certification)
        .filter(Certification.user_id == current_user.id)
        .order_by(Certification.expiry_date.is_(None), Certification.expiry_date.asc())
        .all()
    )
    return [_to_response(c) for c in certs]


@router.post(
    "/me",
    response_model=CertificationResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_my_certification(
    payload: CertificationCreate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Add a new certification for the current user."""
    cert = Certification(user_id=current_user.id, **payload.model_dump())
    db.add(cert)
    db.commit()
    db.refresh(cert)
    return _to_response(cert)


@router.put("/me/{cert_id}", response_model=CertificationResponse)
async def update_my_certification(
    cert_id: int,
    payload: CertificationUpdate,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Update a certification owned by the current user."""
    cert = (
        db.query(Certification)
        .filter(
            Certification.id == cert_id,
            Certification.user_id == current_user.id,
        )
        .first()
    )
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certification not found",
        )

    for field, value in payload.model_dump(exclude_unset=True).items():
        setattr(cert, field, value)

    db.commit()
    db.refresh(cert)
    return _to_response(cert)


@router.delete("/me/{cert_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_my_certification(
    cert_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Delete a certification owned by the current user."""
    cert = (
        db.query(Certification)
        .filter(
            Certification.id == cert_id,
            Certification.user_id == current_user.id,
        )
        .first()
    )
    if not cert:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Certification not found",
        )
    db.delete(cert)
    db.commit()
    return None


@router.get("/user/{user_id}", response_model=List[CertificationResponse])
async def list_user_certifications_admin(
    user_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Admin: list certifications for any user."""
    active_role = get_active_role(current_user)
    if active_role != UserRole.ADMIN.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admins only",
        )
    certs = (
        db.query(Certification)
        .filter(Certification.user_id == user_id)
        .order_by(Certification.expiry_date.is_(None), Certification.expiry_date.asc())
        .all()
    )
    return [_to_response(c) for c in certs]
