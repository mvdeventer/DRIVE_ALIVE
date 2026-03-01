"""
Company schemas for instructor company membership
"""
from pydantic import BaseModel, field_validator
from typing import Optional


class CompanyListItem(BaseModel):
    """Minimal company info for dropdown lists"""
    id: int
    name: str

    class Config:
        from_attributes = True


class CompanyCreate(BaseModel):
    """Create a new company"""
    name: str

    @field_validator("name")
    @classmethod
    def validate_name(cls, v: str) -> str:
        v = v.strip()
        if len(v) < 3:
            raise ValueError("Company name must be at least 3 characters")
        if len(v) > 200:
            raise ValueError("Company name must be 200 characters or fewer")
        return v


class CompanyOut(BaseModel):
    """Full company response"""
    id: int
    name: str
    slug: str
    owner_instructor_id: Optional[int] = None
    is_active: bool

    class Config:
        from_attributes = True
