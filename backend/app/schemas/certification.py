"""
Certification Pydantic schemas
"""

from datetime import date, datetime
from typing import Optional

from pydantic import BaseModel, ConfigDict

from ..models.certification import CertificationType


class CertificationBase(BaseModel):
    cert_type: CertificationType
    cert_code: Optional[str] = None
    number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class CertificationCreate(CertificationBase):
    pass


class CertificationUpdate(BaseModel):
    cert_type: Optional[CertificationType] = None
    cert_code: Optional[str] = None
    number: Optional[str] = None
    issuing_authority: Optional[str] = None
    issued_date: Optional[date] = None
    expiry_date: Optional[date] = None
    notes: Optional[str] = None


class CertificationResponse(CertificationBase):
    id: int
    user_id: int
    created_at: datetime
    updated_at: datetime
    is_expired: bool = False
    days_until_expiry: Optional[int] = None

    model_config = ConfigDict(from_attributes=True)
