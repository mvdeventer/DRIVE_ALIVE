"""Seed a realistic demo dataset: schools, instructors, students AND bookings.

Why this exists alongside ``seed_scale_data.py``
------------------------------------------------
``seed_scale_data.py`` creates accounts only. With no bookings, every admin
analytics screen renders zeros, so it cannot be used to exercise the reporting
surface. This script creates the full graph — bookings across a year, payments,
reviews, credits, and the platform/subscription charge ledger — priced through
``app.services.fees`` so the seeded numbers agree with what the app itself
would compute.

Identity scheme
---------------
Every account uses **one real mailbox** via Gmail plus-addressing
(``mvdeventer123+inst007@gmail.com``) because ``users.email`` is unique, and
**one shared phone number**, which is allowed because ``users.phone`` is
deliberately not unique. ID numbers and licence numbers are unique per person,
as the application enforces.

Usage
-----
    python seed_demo_data.py --companies 10 --instructors 50 --students 200
    python seed_demo_data.py --wipe            # clear demo rows first
"""

from __future__ import annotations

import argparse
from datetime import datetime, timedelta, timezone
from random import Random

from app.database import SessionLocal
from app.models.booking import Booking, BookingStatus, PaymentStatus, Review
from app.models.booking_credit import BookingCredit, CreditStatus
from app.models.company import Company
from app.models.payment import Transaction, TransactionStatus, TransactionType
from app.models.user import (
    Instructor,
    InstructorVerificationStatus,
    Student,
    User,
    UserRole,
    UserStatus,
)
from app.services import billing_service
from app.services.company_service import create_company, ensure_solo_company
from app.services.fees import (
    calculate_platform_charge,
    get_platform_commission_percent,
    resolve_booking_source,
    resolve_student_price,
)
from app.utils.auth import get_password_hash

# Reuse the South African data pools rather than duplicating them.
from seed_scale_data import FIRST_NAMES, LAST_NAMES, PROVINCES, VEHICLES

DEMO_PASSWORD = "Koolkop1@"
BASE_EMAIL_USER = "mvdeventer123"
EMAIL_DOMAIN = "gmail.com"
SHARED_PHONE = "+27611154598"

SCHOOL_NAMES = [
    "Cape Town Driving Academy",
    "Sandton Driver Training",
    "Durban Wheels Driving School",
    "Pretoria Pro Drivers",
    "Gqeberha Road Masters",
    "Bloemfontein Safe Drive",
    "Stellenbosch Driving Institute",
    "Soweto Motion Driving School",
    "Umhlanga Elite Driving",
    "Centurion Learner Hub",
]

LESSON_TYPES = ["beginner", "intermediate", "advanced", "test_preparation"]

# Approximate city centres, so the map preview has plausible pins.
CITY_COORDS = {
    "Johannesburg": (-26.2041, 28.0473),
    "Cape Town": (-33.9249, 18.4241),
    "Durban": (-29.8587, 31.0218),
    "Gqeberha": (-33.9608, 25.6022),
    "Bloemfontein": (-29.0852, 26.1596),
}


def demo_email(tag: str) -> str:
    """Plus-addressed alias — same inbox, unique row."""
    return f"{BASE_EMAIL_USER}+{tag}@{EMAIL_DOMAIN}"


def demo_id_number(n: int) -> str:
    """Deterministic unique 13-digit value (the app requires 13 digits)."""
    return f"{9000000000000 + n}"


def _now() -> datetime:
    return datetime.now(timezone.utc)


def _coords(rng: Random, city: str) -> tuple[float, float]:
    lat, lng = CITY_COORDS.get(city, (-33.9249, 18.4241))
    return lat + rng.uniform(-0.08, 0.08), lng + rng.uniform(-0.08, 0.08)


# --------------------------------------------------------------------------
# Accounts
# --------------------------------------------------------------------------


def _make_user(db, *, tag: str, role: UserRole, n: int, rng: Random, pwd: str) -> User:
    first = rng.choice(FIRST_NAMES)
    last = rng.choice(LAST_NAMES)
    user = User(
        email=demo_email(tag),
        phone=SHARED_PHONE,
        password_hash=pwd,
        first_name=first,
        last_name=last,
        role=role,
        status=UserStatus.ACTIVE,
        id_number=demo_id_number(n),
        terms_accepted_at=_now(),
        preferred_language="en",
    )
    db.add(user)
    db.flush()
    return user


def _make_instructor(
    db,
    *,
    user: User,
    n: int,
    rng: Random,
    company: Company | None,
    is_owner: bool,
    status: InstructorVerificationStatus,
) -> Instructor:
    make, model, year = rng.choice(VEHICLES)
    province, city, suburb = rng.choice(PROVINCES)
    lat, lng = _coords(rng, city)

    instructor = Instructor(
        user_id=user.id,
        license_number=f"DL{n:06d}",
        license_types=rng.choice(["B", "B,EB", "B,EB,C1"]),
        id_number=demo_id_number(500000 + n),
        vehicle_registration=f"CA{n:05d}",
        vehicle_make=make,
        vehicle_model=model,
        vehicle_year=year,
        province=province,
        city=city,
        suburb=suburb,
        current_latitude=lat,
        current_longitude=lng,
        hourly_rate=float(rng.choice([220, 240, 260, 280, 300, 320, 350])),
        service_radius_km=20.0,
        max_travel_distance_km=50.0,
        rate_per_km_beyond_radius=5.0,
        bio=f"Patient, K53-focused instructor based in {suburb}, {city}.",
        is_available=True,
        rating=0.0,
        total_reviews=0,
        is_verified=status == InstructorVerificationStatus.VERIFIED,
        verification_status=status.value,
        company_id=company.id if company else None,
        is_company_owner=is_owner,
    )
    if status == InstructorVerificationStatus.VERIFIED:
        instructor.verified_at = _now()
    db.add(instructor)
    db.flush()
    return instructor


def _make_student(db, *, user: User, n: int, rng: Random, origin: Company | None) -> Student:
    province, city, suburb = rng.choice(PROVINCES)
    lat, lng = _coords(rng, city)
    student = Student(
        user_id=user.id,
        id_number=demo_id_number(700000 + n),
        learners_permit_number=f"LP{n:06d}",
        emergency_contact_name=f"{rng.choice(FIRST_NAMES)} {rng.choice(LAST_NAMES)}",
        emergency_contact_phone=SHARED_PHONE,
        address_line1=f"{rng.randint(1, 250)} {rng.choice(['Main', 'Oak', 'Church', 'Long', 'Beach'])} Street",
        address_line2="",
        province=province,
        city=city,
        suburb=suburb,
        postal_code=f"{rng.randint(1000, 9999)}",
        default_pickup_latitude=lat,
        default_pickup_longitude=lng,
        origin_company_id=origin.id if origin else None,
    )
    db.add(student)
    db.flush()
    return student


# --------------------------------------------------------------------------
# Bookings and the money trail
# --------------------------------------------------------------------------


def _seed_bookings(db, rng: Random, students: list[Student], instructors: list[Instructor]) -> dict:
    """Create a year of bookings, priced through the real fees service."""
    bookable = [i for i in instructors if i.verification_status == InstructorVerificationStatus.VERIFIED.value]
    counts = {"bookings": 0, "completed": 0, "cancelled": 0, "no_show": 0,
              "confirmed": 0, "pending": 0, "reviews": 0, "credits": 0,
              "transactions": 0, "charges": 0}
    now = _now()
    ref = 1

    for student in students:
        for _ in range(rng.randint(2, 14)):
            instructor = rng.choice(bookable)
            company = db.get(Company, instructor.company_id) if instructor.company_id else None
            duration = rng.choice([45, 60, 60, 60, 90, 120])

            base, markup, total = resolve_student_price(instructor, duration)
            source = resolve_booking_source(student, company)

            # Spread across the last 365 days, with a few in the near future.
            offset = rng.randint(-365, 21)
            lesson_date = now + timedelta(days=offset, hours=rng.randint(7, 17))

            if offset < -1:
                roll = rng.random()
                if roll < 0.78:
                    status, pay = BookingStatus.COMPLETED, PaymentStatus.PAID
                elif roll < 0.92:
                    status, pay = BookingStatus.CANCELLED, PaymentStatus.REFUNDED
                else:
                    status, pay = BookingStatus.NO_SHOW, PaymentStatus.PAID
            elif offset < 0:
                status, pay = BookingStatus.IN_PROGRESS, PaymentStatus.PAID
            else:
                status, pay = (
                    (BookingStatus.CONFIRMED, PaymentStatus.PAID)
                    if rng.random() < 0.75
                    else (BookingStatus.PENDING, PaymentStatus.PENDING)
                )

            lat, lng = _coords(rng, student.city or "Cape Town")
            booking = Booking(
                booking_reference=f"DEMO{ref:07d}",
                student_id=student.id,
                instructor_id=instructor.id,
                lesson_date=lesson_date,
                duration_minutes=duration,
                lesson_type=rng.choice(LESSON_TYPES),
                pickup_latitude=lat,
                pickup_longitude=lng,
                pickup_address=f"{student.address_line1}, {student.suburb}, {student.city}",
                dropoff_latitude=lat,
                dropoff_longitude=lng,
                dropoff_address=f"{student.address_line1}, {student.suburb}, {student.city}",
                status=status,
                amount=total,
                instructor_base_amount=base,
                company_markup_amount=markup,
                company_id=instructor.company_id,
                booking_source=source,
                payment_status=pay,
                payment_method=rng.choice(["stripe", "payfast"]),
                payment_id=f"pi_demo_{ref:07d}",
            )
            if status == BookingStatus.COMPLETED:
                booking.completed_at = lesson_date + timedelta(minutes=duration)
            if status == BookingStatus.CANCELLED:
                booking.cancelled_at = lesson_date - timedelta(days=1)
                booking.cancelled_by = rng.choice(["student", "instructor"])
                booking.cancellation_reason = rng.choice(
                    ["Scheduling conflict", "Illness", "Vehicle unavailable", "Weather"]
                )
                booking.cancellation_fee = round(total * 0.1, 2)
                booking.refund_amount = round(total * 0.9, 2)
            db.add(booking)
            db.flush()
            ref += 1
            counts["bookings"] += 1

            # Payment record for anything actually paid.
            if pay == PaymentStatus.PAID:
                db.add(
                    Transaction(
                        transaction_reference=f"TXN{booking.id:08d}",
                        booking_id=booking.id,
                        user_id=student.user_id,
                        transaction_type=TransactionType.PAYMENT,
                        amount=total,
                        currency="ZAR",
                        payment_gateway=booking.payment_method,
                        gateway_transaction_id=booking.payment_id,
                        status=TransactionStatus.SUCCESS,
                    )
                )
                counts["transactions"] += 1

            if status == BookingStatus.COMPLETED:
                counts["completed"] += 1
                # Most completed lessons get reviewed.
                if rng.random() < 0.55:
                    rating = rng.choices([5, 4, 3, 2], weights=[55, 30, 10, 5])[0]
                    db.add(
                        Review(
                            booking_id=booking.id,
                            rating=rating,
                            comment=rng.choice(
                                [
                                    "Very patient and clear instructions.",
                                    "Great lesson, felt much more confident.",
                                    "Always on time and professional.",
                                    "Helpful feedback on my parallel parking.",
                                    "Good lesson overall.",
                                ]
                            ),
                        )
                    )
                    counts["reviews"] += 1
            elif status == BookingStatus.CANCELLED:
                counts["cancelled"] += 1
                # Cancellations leave the learner a credit.
                if rng.random() < 0.6:
                    db.add(
                        BookingCredit(
                            student_id=student.id,
                            original_booking_id=booking.id,
                            credit_amount=booking.refund_amount or 0.0,
                            original_amount=total,
                            status=CreditStatus.AVAILABLE,
                            reason="Lesson cancelled",
                        )
                    )
                    counts["credits"] += 1
            elif status == BookingStatus.NO_SHOW:
                counts["no_show"] += 1
            elif status == BookingStatus.CONFIRMED:
                counts["confirmed"] += 1
            elif status == BookingStatus.PENDING:
                counts["pending"] += 1

            # Commission ledger — cancelled lessons must NOT be billed.
            if status != BookingStatus.CANCELLED and company is not None:
                pct = get_platform_commission_percent(db, company)
                charge_amount = calculate_platform_charge(
                    total,
                    pct,
                    booking_source=source,
                    is_platform_host=bool(company.is_platform_host),
                    has_company=True,
                )
                charge = billing_service.record_platform_charge(
                    db,
                    company_id=company.id,
                    booking_id=booking.id,
                    basis_amount=total,
                    commission_percent=pct,
                    charge_amount=charge_amount,
                )
                if charge is not None:
                    # Bill the charge in the month the lesson happened, so the
                    # period filter on /admin/platform-revenue is meaningful.
                    charge.period_key = lesson_date.strftime("%Y-%m")
                    counts["charges"] += 1

    return counts


def _refresh_ratings(db, instructors: list[Instructor]) -> None:
    """Recompute instructor rating/total_reviews from the seeded reviews."""
    from sqlalchemy import func

    rows = (
        db.query(Booking.instructor_id, func.avg(Review.rating), func.count(Review.id))
        .join(Review, Review.booking_id == Booking.id)
        .group_by(Booking.instructor_id)
        .all()
    )
    by_id = {r[0]: (float(r[1]), int(r[2])) for r in rows}
    for instructor in instructors:
        avg, cnt = by_id.get(instructor.id, (0.0, 0))
        instructor.rating = round(avg, 2)
        instructor.total_reviews = cnt


def seed(companies_n: int, instructors_n: int, students_n: int, rng_seed: int) -> None:
    rng = Random(rng_seed)
    db = SessionLocal()
    pwd = get_password_hash(DEMO_PASSWORD)

    try:
        # ---- Schools -------------------------------------------------------
        companies: list[Company] = []
        for i in range(companies_n):
            name = SCHOOL_NAMES[i] if i < len(SCHOOL_NAMES) else f"Demo Driving School {i + 1}"
            company = create_company(db, name)
            company.subscription_price_per_instructor = float(rng.choice([99, 149, 199]))
            company.billing_email = demo_email(f"school{i + 1:02d}")
            companies.append(company)
        db.flush()

        # ---- Instructors ---------------------------------------------------
        instructors: list[Instructor] = []
        seq = 0

        # One owner per school.
        for i, company in enumerate(companies):
            seq += 1
            user = _make_user(db, tag=f"owner{i + 1:02d}", role=UserRole.INSTRUCTOR, n=seq, rng=rng, pwd=pwd)
            instructor = _make_instructor(
                db, user=user, n=seq, rng=rng, company=company, is_owner=True,
                status=InstructorVerificationStatus.VERIFIED,
            )
            company.owner_instructor_id = instructor.id
            instructors.append(instructor)

        # The rest: employed, independent, and a few deliberately left pending
        # so the verification workflow has something to act on.
        remaining = max(instructors_n - len(companies), 0)
        pending_admin_target, pending_company_target = 5, 3
        for i in range(remaining):
            seq += 1
            tag = f"inst{i + 1:03d}"
            user = _make_user(db, tag=tag, role=UserRole.INSTRUCTOR, n=seq, rng=rng, pwd=pwd)

            if i < pending_admin_target:
                company, status = None, InstructorVerificationStatus.PENDING_ADMIN
            elif i < pending_admin_target + pending_company_target:
                company, status = rng.choice(companies), InstructorVerificationStatus.PENDING_COMPANY
            elif rng.random() < 0.7:
                company, status = rng.choice(companies), InstructorVerificationStatus.VERIFIED
            else:
                company, status = None, InstructorVerificationStatus.VERIFIED

            instructor = _make_instructor(
                db, user=user, n=seq, rng=rng, company=company, is_owner=False, status=status,
            )

            # A school takes a margin on its employed instructors.
            if company is not None:
                if rng.random() < 0.7:
                    instructor.company_markup_type = "percent"
                    instructor.company_markup_value = float(rng.choice([12, 15, 18, 20, 25]))
                else:
                    instructor.company_markup_type = "amount"
                    instructor.company_markup_value = float(rng.choice([30, 40, 50, 60]))
            else:
                # Independents get a one-person company so bookings stay billable.
                ensure_solo_company(db, user, instructor)

            instructors.append(instructor)
        db.flush()

        # ---- Students ------------------------------------------------------
        students: list[Student] = []
        for i in range(students_n):
            seq += 1
            user = _make_user(db, tag=f"stud{i + 1:03d}", role=UserRole.STUDENT, n=seq, rng=rng, pwd=pwd)
            # ~30% were enrolled directly by a school (no platform commission).
            origin = rng.choice(companies) if rng.random() < 0.3 else None
            students.append(_make_student(db, user=user, n=seq, rng=rng, origin=origin))
        db.flush()
        db.commit()

        # ---- Bookings and the money trail ----------------------------------
        counts = _seed_bookings(db, rng, students, instructors)
        _refresh_ratings(db, instructors)
        db.commit()

        # ---- Monthly subscription accrual ----------------------------------
        subs = 0
        for company in companies:
            if billing_service.accrue_subscription(db, company) is not None:
                subs += 1
        db.commit()

        print("DEMO_SEED_RESULT", {
            "companies": len(companies),
            "instructors": len(instructors),
            "students": len(students),
            "subscription_charges": subs,
            "login_password": DEMO_PASSWORD,
            "email_pattern": demo_email("<tag>"),
            "shared_phone": SHARED_PHONE,
            **counts,
        })
    finally:
        db.close()


def main() -> None:
    parser = argparse.ArgumentParser(description="Seed demo data with bookings")
    parser.add_argument("--companies", type=int, default=10)
    parser.add_argument("--instructors", type=int, default=50)
    parser.add_argument("--students", type=int, default=200)
    parser.add_argument("--seed", type=int, default=2026)
    args = parser.parse_args()

    seed(args.companies, args.instructors, args.students, args.seed)


if __name__ == "__main__":
    main()
