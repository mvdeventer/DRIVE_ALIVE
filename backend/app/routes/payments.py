"""
Payment routes for Stripe integration with payment-first workflow
Students pay R10 booking fee BEFORE lessons are created
"""

import json
import uuid
from datetime import datetime, timezone
from typing import Annotated

import stripe
from fastapi import APIRouter, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.booking import Booking, BookingStatus, PaymentStatus
from ..models.payment_session import PaymentSession, PaymentSessionStatus
from ..models.user import Instructor, Student, User, UserRole
from ..routes.auth import get_current_user
from ..schemas.payment import PaymentInitiateRequest, PaymentInitiateResponse
from ..services.whatsapp_service import whatsapp_service

router = APIRouter(prefix="/payments", tags=["Payments"])

# Configure Stripe (use mock mode if no key provided)
MOCK_PAYMENT_MODE = not settings.STRIPE_SECRET_KEY
if not MOCK_PAYMENT_MODE:
    stripe.api_key = settings.STRIPE_SECRET_KEY


@router.post("/initiate", response_model=PaymentInitiateResponse)
async def initiate_payment(
    request: PaymentInitiateRequest,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Initiate payment session BEFORE creating bookings
    Returns Stripe Checkout URL
    """
    if current_user.role != UserRole.STUDENT:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only students can create bookings",
        )

    student = db.query(Student).filter(Student.user_id == current_user.id).first()
    if not student:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Student profile not found"
        )

    instructor = (
        db.query(Instructor).filter(Instructor.id == request.instructor_id).first()
    )
    if not instructor:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Instructor not found"
        )

    if not instructor.is_available:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Instructor is not available",
        )

    # Calculate amounts
    bookings_count = len(request.bookings)
    total_lesson_amount = 0.0

    for booking_data in request.bookings:
        duration_minutes = booking_data.get("duration_minutes", 60)
        lesson_amount = instructor.hourly_rate * (duration_minutes / 60)
        total_lesson_amount += lesson_amount

    booking_fee = settings.BOOKING_FEE * bookings_count
    total_amount = total_lesson_amount + booking_fee

    # Create payment session
    payment_session_id = f"PS{uuid.uuid4().hex[:12].upper()}"
    payment_session = PaymentSession(
        payment_session_id=payment_session_id,
        user_id=current_user.id,
        instructor_id=instructor.id,
        bookings_data=json.dumps(request.bookings),
        amount=total_lesson_amount,
        booking_fee=booking_fee,
        total_amount=total_amount,
        payment_gateway="stripe",
        status=PaymentSessionStatus.PENDING,
    )

    db.add(payment_session)
    db.commit()
    db.refresh(payment_session)

    # Simplify description
    item_name = f"{bookings_count} Driving Lesson"
    if bookings_count > 1:
        item_name += "s"

    # Create item description
    item_description = (
        f"Booking fee (R{booking_fee:.2f}) + Lessons (R{total_lesson_amount:.2f})"
    )

    # Print to console for debugging
    print("\n" + "=" * 80)
    print(
        "💳 PAYMENT INITIATION" + (" (MOCK MODE)" if MOCK_PAYMENT_MODE else " (STRIPE)")
    )
    print("=" * 80)
    print(f"Payment Session ID: {payment_session_id}")
    print(f"Student: {current_user.first_name} {current_user.last_name}")
    print(f"Instructor ID: {instructor.id}")
    print(f"Bookings Count: {bookings_count}")
    print(f"Total Amount: R{total_amount:.2f}")
    print("=" * 80)

    # MOCK PAYMENT MODE (for development without Stripe keys)
    if MOCK_PAYMENT_MODE:
        base_url = settings.ALLOWED_ORIGINS.split(",")[0]
        mock_payment_url = f"{base_url}/payment/mock?session_id={payment_session_id}"

        payment_session.gateway_transaction_id = f"mock_{uuid.uuid4().hex[:8]}"
        db.commit()

        print(f"⚠️  MOCK MODE: Payment will auto-complete")
        print(f"✅ Mock Payment URL: {mock_payment_url}")
        print("=" * 80)

        return PaymentInitiateResponse(
            payment_url=mock_payment_url,
            payment_session_id=payment_session_id,
            amount=total_lesson_amount,
            booking_fee=booking_fee,
            total_amount=total_amount,
            bookings_count=bookings_count,
        )

    # REAL STRIPE MODE
    # Generate Stripe Checkout Session
    try:
        # Create Stripe Checkout Session
        checkout_session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": "zar",
                        "unit_amount": int(total_amount * 100),  # Convert to cents
                        "product_data": {
                            "name": item_name,
                            "description": item_description,
                        },
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=f"{settings.ALLOWED_ORIGINS.split(',')[0]}/payment/success?session_id={{CHECKOUT_SESSION_ID}}",
            cancel_url=f"{settings.ALLOWED_ORIGINS.split(',')[0]}/payment/cancel",
            metadata={
                "payment_session_id": payment_session_id,
                "user_id": str(current_user.id),
                "instructor_id": str(instructor.id),
            },
            customer_email=current_user.email,
        )

        # Update payment session with Stripe session ID
        payment_session.gateway_transaction_id = checkout_session.id
        db.commit()

        print(f"✅ Stripe Checkout URL: {checkout_session.url}")
        print("=" * 80)

        return PaymentInitiateResponse(
            payment_url=checkout_session.url,
            payment_session_id=payment_session_id,
            amount=total_lesson_amount,
            booking_fee=booking_fee,
            total_amount=total_amount,
            bookings_count=bookings_count,
        )

    except stripe.error.StripeError as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Stripe error: {str(e)}",
        )


@router.post("/webhook")
async def stripe_webhook(request: Request, db: Session = Depends(get_db)):
    """
    Stripe webhook - Creates bookings after payment
    """
    import logging

    logger = logging.getLogger(__name__)

    # Get the raw body for signature verification
    payload = await request.body()
    sig_header = request.headers.get("stripe-signature")

    try:
        # Verify webhook signature (skip in development if no webhook secret)
        if settings.STRIPE_WEBHOOK_SECRET:
            event = stripe.Webhook.construct_event(
                payload, sig_header, settings.STRIPE_WEBHOOK_SECRET
            )
        else:
            # Development mode - parse without verification
            event = stripe.Event.construct_from(json.loads(payload), stripe.api_key)

        logger.info(f"📧 Stripe webhook received: {event['type']}")

    except ValueError as e:
        logger.error(f"❌ Invalid payload: {e}")
        raise HTTPException(status_code=400, detail="Invalid payload")
    except stripe.error.SignatureVerificationError as e:
        logger.error(f"❌ Invalid signature: {e}")
        raise HTTPException(status_code=400, detail="Invalid signature")

    # Handle checkout.session.completed event
    if event["type"] == "checkout.session.completed":
        session = event["data"]["object"]

        payment_session_id = session["metadata"].get("payment_session_id")
        if not payment_session_id:
            logger.error("❌ No payment_session_id in webhook")
            return {"status": "error", "message": "Missing payment_session_id"}

        payment_session = (
            db.query(PaymentSession)
            .filter(PaymentSession.payment_session_id == payment_session_id)
            .first()
        )

        if not payment_session:
            logger.error(f"❌ Payment session not found: {payment_session_id}")
            return {"status": "error", "message": "Payment session not found"}

        if payment_session.status == PaymentSessionStatus.COMPLETED:
            logger.info(f"✅ Payment already processed: {payment_session_id}")
            return {"status": "already_processed"}

        # Update payment session
        payment_session.status = PaymentSessionStatus.COMPLETED
        payment_session.gateway_transaction_id = session.get("payment_intent")
        payment_session.gateway_response = json.dumps(dict(session))
        payment_session.completed_at = datetime.now(timezone.utc)

        # Get user and instructor
        user = db.query(User).filter(User.id == payment_session.user_id).first()
        student = db.query(Student).filter(Student.user_id == user.id).first()
        instructor = (
            db.query(Instructor)
            .filter(Instructor.id == payment_session.instructor_id)
            .first()
        )

        if not user or not student or not instructor:
            logger.error("❌ User or instructor not found")
            return {"status": "error", "message": "User or instructor not found"}

        # Create bookings from payment session
        bookings_data = json.loads(payment_session.bookings_data)
        created_bookings = []

        for booking_data in bookings_data:
            lesson_date_str = booking_data.get("lesson_date")
            duration_minutes = booking_data.get("duration_minutes", 60)
            pickup_address = booking_data.get("pickup_address", "")
            student_notes = booking_data.get("student_notes")

            lesson_datetime = datetime.fromisoformat(
                lesson_date_str.replace("Z", "+00:00")
            )
            lesson_amount = instructor.hourly_rate * (duration_minutes / 60)

            booking = Booking(
                booking_reference=f"BK{uuid.uuid4().hex[:8].upper()}",
                student_id=student.id,
                instructor_id=instructor.id,
                lesson_date=lesson_datetime,
                duration_minutes=duration_minutes,
                lesson_type="standard",
                pickup_latitude=0.0,
                pickup_longitude=0.0,
                pickup_address=pickup_address,
                amount=lesson_amount,
                booking_fee=settings.BOOKING_FEE,
                status=BookingStatus.CONFIRMED,
                payment_status=PaymentStatus.PAID,
                payment_method="stripe",
                payment_id=payment_session.gateway_transaction_id,
                student_notes=student_notes,
            )

            db.add(booking)
            created_bookings.append(booking)

        db.commit()

        # Send WhatsApp confirmations
        for booking in created_bookings:
            try:
                db.refresh(booking)
                whatsapp_service.send_booking_confirmation(
                    student_name=f"{user.first_name} {user.last_name}",
                    student_phone=user.phone,
                    instructor_name=f"{instructor.user.first_name} {instructor.user.last_name}",
                    lesson_date=booking.lesson_date,
                    pickup_address=booking.pickup_address,
                    amount=booking.amount + booking.booking_fee,
                    booking_reference=booking.booking_reference,
                )
                logger.info(f"✅ WhatsApp sent for {booking.booking_reference}")
            except Exception as e:
                logger.error(f"❌ WhatsApp failed for {booking.booking_reference}: {e}")

        logger.info(
            f"✅ Created {len(created_bookings)} bookings for {payment_session_id}"
        )

        return {"status": "success", "bookings_created": len(created_bookings)}

    # Return success for other event types
    return {"status": "success"}


@router.get("/session/{payment_session_id}")
async def get_payment_session(
    payment_session_id: str,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """Get payment session status"""
    payment_session = (
        db.query(PaymentSession)
        .filter(PaymentSession.payment_session_id == payment_session_id)
        .first()
    )

    if not payment_session:
        raise HTTPException(status_code=404, detail="Payment session not found")

    if payment_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    return {
        "payment_session_id": payment_session.payment_session_id,
        "status": payment_session.status,
        "amount": payment_session.amount,
        "booking_fee": payment_session.booking_fee,
        "total_amount": payment_session.total_amount,
        "payment_gateway": payment_session.payment_gateway,
        "created_at": payment_session.created_at,
        "completed_at": payment_session.completed_at,
    }


@router.post("/mock-complete")
async def complete_mock_payment(
    request: Request,
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
):
    """
    Complete a mock payment (development only)
    Manually triggers webhook logic to create bookings
    """
    if not MOCK_PAYMENT_MODE:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Mock payment mode is disabled. Set STRIPE_SECRET_KEY to empty to enable.",
        )

    body = await request.json()
    payment_session_id = body.get("payment_session_id")
    success = body.get("success", True)

    payment_session = (
        db.query(PaymentSession)
        .filter(PaymentSession.payment_session_id == payment_session_id)
        .first()
    )

    if not payment_session:
        raise HTTPException(status_code=404, detail="Payment session not found")

    if payment_session.user_id != current_user.id:
        raise HTTPException(status_code=403, detail="Not authorized")

    if not success:
        # Mark as cancelled
        payment_session.status = PaymentSessionStatus.CANCELLED
        db.commit()
        return {"status": "cancelled", "message": "Mock payment cancelled"}

    # Simulate successful payment - manually trigger webhook logic
    if payment_session.status == PaymentSessionStatus.COMPLETED:
        return {
            "status": "already_completed",
            "message": "Payment already processed",
        }

    # Update payment session
    payment_session.status = PaymentSessionStatus.COMPLETED
    payment_session.completed_at = datetime.now(timezone.utc)
    payment_session.transaction_id = f"mock_{uuid.uuid4().hex[:16]}"

    # Create bookings from payment session metadata
    metadata = payment_session.metadata
    student = db.query(Student).filter(Student.user_id == current_user.id).first()

    if not student:
        raise HTTPException(status_code=404, detail="Student profile not found")

    created_bookings = []
    for booking_data in metadata.get("bookings", []):
        booking = Booking(
            student_id=student.id,
            instructor_id=booking_data["instructor_id"],
            scheduled_time=datetime.fromisoformat(booking_data["scheduled_time"]),
            duration=booking_data["duration"],
            pickup_location=booking_data["pickup_location"],
            dropoff_location=booking_data["dropoff_location"],
            lesson_type=booking_data["lesson_type"],
            hourly_rate=booking_data["hourly_rate"],
            total_amount=booking_data["total_amount"],
            booking_fee=payment_session.booking_fee,
            status=BookingStatus.CONFIRMED,
            payment_status=PaymentStatus.PAID,
            payment_session_id=payment_session.payment_session_id,
            notes=booking_data.get("notes"),
        )
        db.add(booking)
        created_bookings.append(booking_data)

    db.commit()

    # Send WhatsApp confirmation (if enabled)
    try:
        instructor = (
            db.query(Instructor)
            .filter(Instructor.id == created_bookings[0]["instructor_id"])
            .first()
        )
        student_user = db.query(User).filter(User.id == student.user_id).first()

        if instructor and student_user:
            instructor_user = (
                db.query(User).filter(User.id == instructor.user_id).first()
            )
            booking_details = {
                "student_name": f"{student_user.first_name} {student_user.last_name}",
                "instructor_name": f"{instructor_user.first_name} {instructor_user.last_name}",
                "date": created_bookings[0]["scheduled_time"][:10],
                "time": created_bookings[0]["scheduled_time"][11:16],
                "pickup": created_bookings[0]["pickup_location"],
            }
            whatsapp_service.send_booking_confirmation(
                student_user.phone, booking_details
            )
    except Exception as e:
        print(f"WhatsApp notification failed: {e}")

    return {
        "status": "success",
        "message": f"Mock payment completed. {len(created_bookings)} booking(s) created.",
        "bookings_created": len(created_bookings),
    }
