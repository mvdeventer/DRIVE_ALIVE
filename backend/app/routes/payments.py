"""
Payment routes for Stripe and PayFast integration
"""
from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from typing import Annotated
import stripe
import hashlib
import urllib.parse
from datetime import datetime

from ..database import get_db
from ..routes.auth import get_current_user
from ..models.user import User
from ..models.booking import Booking, PaymentStatus
from ..models.payment import Transaction, TransactionType, TransactionStatus
from ..config import settings

router = APIRouter(prefix="/payments", tags=["Payments"])

# Initialize Stripe
stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/stripe/create-payment-intent")
async def create_stripe_payment_intent(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Create a Stripe payment intent for a booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify booking belongs to current user
    if current_user.student_profile and booking.student_id != current_user.student_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to pay for this booking"
        )
    
    # Check if already paid
    if booking.payment_status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already paid"
        )
    
    try:
        # Create payment intent
        amount_cents = int(booking.amount * 100)  # Convert to cents
        
        payment_intent = stripe.PaymentIntent.create(
            amount=amount_cents,
            currency="zar",
            metadata={
                "booking_id": booking.id,
                "user_id": current_user.id
            }
        )
        
        # Create transaction record
        transaction = Transaction(
            transaction_reference=f"TXN{payment_intent.id}",
            booking_id=booking.id,
            user_id=current_user.id,
            transaction_type=TransactionType.PAYMENT,
            amount=booking.amount,
            currency="ZAR",
            payment_gateway="stripe",
            gateway_transaction_id=payment_intent.id,
            status=TransactionStatus.PENDING
        )
        
        db.add(transaction)
        booking.payment_method = "stripe"
        booking.payment_id = payment_intent.id
        
        db.commit()
        
        return {
            "client_secret": payment_intent.client_secret,
            "payment_intent_id": payment_intent.id
        }
    
    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/stripe/webhook")
async def stripe_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle Stripe webhook events
    """
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")
    
    try:
        event = stripe.Webhook.construct_event(
            payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
        )
    except ValueError:
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError:
        raise HTTPException(status_code=400, detail="Invalid signature")
    
    # Handle payment_intent.succeeded event
    if event["type"] == "payment_intent.succeeded":
        payment_intent = event["data"]["object"]
        
        # Find booking
        booking = db.query(Booking).filter(Booking.payment_id == payment_intent.id).first()
        
        if booking:
            booking.payment_status = PaymentStatus.PAID
            
            # Update transaction
            transaction = db.query(Transaction).filter(
                Transaction.gateway_transaction_id == payment_intent.id
            ).first()
            
            if transaction:
                transaction.status = TransactionStatus.SUCCESS
                transaction.completed_at = datetime.utcnow()
            
            db.commit()
    
    return {"status": "success"}


@router.post("/payfast/create-payment")
async def create_payfast_payment(
    booking_id: int,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db)
):
    """
    Create a PayFast payment for a booking
    """
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found"
        )
    
    # Verify booking belongs to current user
    if current_user.student_profile and booking.student_id != current_user.student_profile.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to pay for this booking"
        )
    
    # Check if already paid
    if booking.payment_status == PaymentStatus.PAID:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking already paid"
        )
    
    # Create PayFast payment data
    payment_data = {
        "merchant_id": settings.PAYFAST_MERCHANT_ID,
        "merchant_key": settings.PAYFAST_MERCHANT_KEY,
        "return_url": f"{settings.ALLOWED_ORIGINS.split(',')[0]}/payment/success",
        "cancel_url": f"{settings.ALLOWED_ORIGINS.split(',')[0]}/payment/cancel",
        "notify_url": f"{settings.ALLOWED_ORIGINS.split(',')[0]}/api/payments/payfast/webhook",
        "amount": f"{booking.amount:.2f}",
        "item_name": f"Driving Lesson - {booking.booking_reference}",
        "custom_str1": str(booking.id),
        "custom_str2": str(current_user.id),
    }
    
    # Generate signature
    signature_string = "&".join([f"{k}={urllib.parse.quote_plus(str(v))}" for k, v in sorted(payment_data.items())])
    if settings.PAYFAST_PASSPHRASE:
        signature_string += f"&passphrase={urllib.parse.quote_plus(settings.PAYFAST_PASSPHRASE)}"
    
    signature = hashlib.md5(signature_string.encode()).hexdigest()
    payment_data["signature"] = signature
    
    # Create transaction record
    transaction = Transaction(
        transaction_reference=f"TXN{booking.booking_reference}",
        booking_id=booking.id,
        user_id=current_user.id,
        transaction_type=TransactionType.PAYMENT,
        amount=booking.amount,
        currency="ZAR",
        payment_gateway="payfast",
        status=TransactionStatus.PENDING
    )
    
    db.add(transaction)
    booking.payment_method = "payfast"
    
    db.commit()
    
    # Determine PayFast URL based on mode
    payfast_url = "https://www.payfast.co.za/eng/process" if settings.PAYFAST_MODE == "live" else "https://sandbox.payfast.co.za/eng/process"
    
    return {
        "payment_url": payfast_url,
        "payment_data": payment_data
    }


@router.post("/payfast/webhook")
async def payfast_webhook(
    request: Request,
    db: Session = Depends(get_db)
):
    """
    Handle PayFast webhook (ITN - Instant Transaction Notification)
    """
    form_data = await request.form()
    data = dict(form_data)
    
    # Verify payment status
    if data.get("payment_status") == "COMPLETE":
        booking_id = data.get("custom_str1")
        
        if booking_id:
            booking = db.query(Booking).filter(Booking.id == int(booking_id)).first()
            
            if booking:
                booking.payment_status = PaymentStatus.PAID
                
                # Update transaction
                transaction = db.query(Transaction).filter(
                    Transaction.booking_id == booking.id,
                    Transaction.payment_gateway == "payfast"
                ).first()
                
                if transaction:
                    transaction.status = TransactionStatus.SUCCESS
                    transaction.gateway_transaction_id = data.get("pf_payment_id")
                    transaction.completed_at = datetime.utcnow()
                
                db.commit()
    
    return {"status": "success"}
