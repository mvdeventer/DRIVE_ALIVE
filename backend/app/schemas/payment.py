"""
Payment schemas for PayFast and Stripe integration
"""

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel, Field, validator


class PaymentInitiateRequest(BaseModel):
    """Request to initiate a payment for booking(s)"""

    instructor_id: int
    bookings: List[dict]  # List of booking data (date, time, duration, pickup_address)
    payment_gateway: str = Field(
        default="payfast", description="Payment gateway: 'payfast' or 'stripe'"
    )
    reschedule_booking_id: Optional[int] = Field(
        None,
        description="ID of the original booking being rescheduled. "
        "If set, the old booking will be marked as RESCHEDULED after payment.",
    )

    @validator("payment_gateway")
    def validate_gateway(cls, v):
        if v not in ["payfast", "stripe"]:
            raise ValueError("payment_gateway must be 'payfast' or 'stripe'")
        return v


class PaymentInitiateResponse(BaseModel):
    """Response with payment URL and session ID"""

    payment_url: str
    payment_session_id: str  # Unique ID to track this payment session
    amount: float
    booking_fee: float
    total_amount: float
    bookings_count: int
    credit_applied: float = 0.0
    original_total: float = 0.0


class PayFastNotification(BaseModel):
    """PayFast ITN (Instant Transaction Notification) data"""

    m_payment_id: str
    pf_payment_id: str
    payment_status: str
    item_name: str
    item_description: Optional[str] = None
    amount_gross: str
    amount_fee: str
    amount_net: str
    custom_str1: Optional[str] = None  # payment_session_id
    custom_str2: Optional[str] = None
    custom_str3: Optional[str] = None
    custom_int1: Optional[int] = None
    custom_int2: Optional[int] = None
    name_first: Optional[str] = None
    name_last: Optional[str] = None
    email_address: Optional[str] = None
    merchant_id: str
    signature: str


class PaymentSessionResponse(BaseModel):
    """Payment session details"""

    payment_session_id: str
    user_id: int
    instructor_id: int
    bookings_data: List[dict]
    amount: float
    booking_fee: float
    total_amount: float
    payment_status: str  # pending, completed, failed, cancelled
    payment_gateway: str
    gateway_transaction_id: Optional[str] = None
    created_at: datetime
    completed_at: Optional[datetime] = None

    class Config:
        from_attributes = True
