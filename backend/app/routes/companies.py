"""
Company routes — public read endpoints + admin management
"""
from typing import List

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..schemas.company import CompanyListItem, CompanyOut
from ..services.company_service import (
    get_all_active_companies,
    get_company_by_id,
)

router = APIRouter(prefix="/companies", tags=["companies"])


@router.get("", response_model=List[CompanyListItem])
async def list_companies(db: Session = Depends(get_db)):
    """
    Return all active companies (used in registration dropdown).
    Public — no auth required.
    """
    companies = get_all_active_companies(db)
    return companies


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
