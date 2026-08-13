"""
Company routes — public read endpoints + admin management
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.company import CompanyListItem, CompanyOut
from ..services.company_service import (
    get_company_by_id,
    get_joinable_schools,
)

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=List[CompanyListItem])
async def list_companies(db: Session = Depends(get_db)):
    """
    Return the driving schools an instructor can ask to join (registration
    dropdown). Solo one-person companies and the platform host are not schools
    and are left out — see ``get_joinable_schools``.
    Public — no auth required.
    """
    return get_joinable_schools(db)


@router.get("/{company_id}", response_model=CompanyOut)
async def get_company(company_id: int, db: Session = Depends(get_db)):
    """Get a single company by ID."""
    company = get_company_by_id(db, company_id)
    if not company:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Company not found",
        )
    return company
