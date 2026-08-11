"""What each school owes the platform.

The ledger is an accrual record, not a movement of money: the platform is
merchant of record and already holds the student's payment, so a charge here
is a deduction from a future payout.

The property that matters most is idempotency. A replayed Stripe webhook must
not bill a school twice for the same lesson.
"""

from datetime import datetime, timezone

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# app/routes/__init__.py must settle before app modules are imported directly.
import app.routes  # noqa: F401
from app.database import Base
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.models.company import Company
from app.models.company_charge import (
    ChargeStatus,
    CompanyPlatformCharge,
    CompanySubscriptionCharge,
    period_key_for,
)
from app.models.user import Instructor, Student, User, UserRole, UserStatus
from app.services.billing_service import (
    accrue_subscription,
    company_statement,
    mark_settled,
    platform_revenue,
    record_platform_charge,
)


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX ix_companies_single_platform_host "
                "ON companies (is_platform_host) WHERE is_platform_host = 1"
            )
        )
        conn.commit()
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def _school(db, name="Alpha", *, is_host=False, subscription=None):
    company = Company(
        name=name,
        slug=name.lower(),
        is_platform_host=is_host,
        platform_commission_percent=8.0,
        subscription_price_per_instructor=subscription,
    )
    db.add(company)
    db.commit()
    return company


def _booking(db, *, company, amount=420.0, ref="BK1"):
    user = User(
        email=f"{ref}@example.com",
        phone="+27600000000",
        password_hash="x",
        first_name="A",
        last_name="B",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    student = Student(
        user_id=user.id,
        id_number=f"79011751{user.id:05d}",
        emergency_contact_name="Kin",
        emergency_contact_phone="+27600000009",
        address_line1="1 Main Road",
        postal_code="7560",
    )
    db.add(student)
    db.commit()
    booking = Booking(
        booking_reference=ref,
        student_id=student.id,
        instructor_id=1,
        lesson_date=datetime.now(timezone.utc),
        duration_minutes=60,
        lesson_type="standard",
        pickup_address="x",
        pickup_latitude=0.0,
        pickup_longitude=0.0,
        amount=amount,
        company_id=company.id,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
    )
    db.add(booking)
    db.commit()
    return booking


def _teacher(db, company, email):
    user = User(
        email=email,
        phone="+27600000001",
        password_hash="x",
        first_name="T",
        last_name="R",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    instructor = Instructor(
        user_id=user.id,
        license_number=f"L{user.id}",
        license_types="B",
        id_number=f"79011752{user.id:05d}",
        vehicle_registration="CA1",
        vehicle_make="VW",
        vehicle_model="Polo",
        vehicle_year=2020,
        hourly_rate=350.0,
        company_id=company.id,
    )
    db.add(instructor)
    db.commit()
    return instructor


# ── Commission accrual ─────────────────────────────────────────────────────


def test_a_charge_records_the_rate_and_the_amount_it_was_taken_on(db):
    company = _school(db)
    booking = _booking(db, company=company)

    charge = record_platform_charge(
        db,
        company_id=company.id,
        booking_id=booking.id,
        basis_amount=420.0,
        commission_percent=8.0,
        charge_amount=33.60,
    )
    db.commit()

    assert charge.basis_amount == 420.0
    assert charge.commission_percent == 8.0
    assert charge.charge_amount == 33.60
    assert charge.status == ChargeStatus.ACCRUED.value
    assert charge.period_key == period_key_for()


def test_billing_the_same_booking_twice_does_not_double_charge(db):
    """A replayed Stripe webhook must not cost the school twice."""
    company = _school(db)
    booking = _booking(db, company=company)

    first = record_platform_charge(
        db, company_id=company.id, booking_id=booking.id,
        basis_amount=420.0, commission_percent=8.0, charge_amount=33.60,
    )
    db.commit()
    second = record_platform_charge(
        db, company_id=company.id, booking_id=booking.id,
        basis_amount=420.0, commission_percent=8.0, charge_amount=33.60,
    )
    db.commit()

    assert first.id == second.id
    assert db.query(CompanyPlatformCharge).count() == 1


def test_the_unique_constraint_is_enforced_by_the_database(db):
    """Not merely by the read-then-write check above."""
    from sqlalchemy.exc import IntegrityError

    company = _school(db)
    booking = _booking(db, company=company)
    db.add(
        CompanyPlatformCharge(
            company_id=company.id, booking_id=booking.id, basis_amount=1,
            commission_percent=8, charge_amount=1, period_key="2026-08",
        )
    )
    db.commit()

    db.add(
        CompanyPlatformCharge(
            company_id=company.id, booking_id=booking.id, basis_amount=1,
            commission_percent=8, charge_amount=1, period_key="2026-08",
        )
    )
    with pytest.raises(IntegrityError):
        db.commit()


def test_no_charge_for_an_independent_instructor(db):
    """Nobody to bill: there is no school behind the booking."""
    assert record_platform_charge(
        db, company_id=None, booking_id=1,
        basis_amount=350.0, commission_percent=8.0, charge_amount=28.0,
    ) is None
    assert db.query(CompanyPlatformCharge).count() == 0


def test_no_zero_value_rows(db):
    """A school-sourced or host booking would otherwise clutter statements."""
    company = _school(db)
    booking = _booking(db, company=company)

    assert record_platform_charge(
        db, company_id=company.id, booking_id=booking.id,
        basis_amount=420.0, commission_percent=8.0, charge_amount=0.0,
    ) is None
    assert db.query(CompanyPlatformCharge).count() == 0


# ── Subscription accrual ───────────────────────────────────────────────────


def test_subscription_bills_per_active_instructor(db):
    company = _school(db, subscription=349.0)
    _teacher(db, company, "a@x.com")
    _teacher(db, company, "b@x.com")

    charge = accrue_subscription(db, company)

    assert charge.instructor_count == 2
    assert charge.charge_amount == 698.0


def test_rerunning_the_accrual_updates_rather_than_duplicates(db):
    company = _school(db, subscription=349.0)
    _teacher(db, company, "a@x.com")
    accrue_subscription(db, company)

    _teacher(db, company, "b@x.com")
    charge = accrue_subscription(db, company)

    assert db.query(CompanySubscriptionCharge).count() == 1
    assert charge.instructor_count == 2
    assert charge.charge_amount == 698.0


def test_a_settled_subscription_line_is_not_rewritten(db):
    """Once billed, a period is history."""
    company = _school(db, subscription=349.0)
    _teacher(db, company, "a@x.com")
    charge = accrue_subscription(db, company)
    mark_settled(db, charge, "EFT-001")
    db.commit()

    _teacher(db, company, "b@x.com")
    again = accrue_subscription(db, company)

    assert again.instructor_count == 1
    assert again.charge_amount == 349.0
    assert again.status == ChargeStatus.SETTLED.value


def test_the_platform_host_is_never_billed_a_subscription(db):
    host = _school(db, name="Host", is_host=True, subscription=349.0)
    _teacher(db, host, "a@x.com")

    assert accrue_subscription(db, host) is None
    assert db.query(CompanySubscriptionCharge).count() == 0


def test_no_subscription_when_no_price_is_set(db):
    company = _school(db, subscription=None)
    _teacher(db, company, "a@x.com")

    assert accrue_subscription(db, company) is None


# ── Statement and revenue ──────────────────────────────────────────────────


def test_a_statement_totals_commission_and_subscription(db):
    company = _school(db, subscription=349.0)
    _teacher(db, company, "a@x.com")
    for i in range(2):
        booking = _booking(db, company=company, ref=f"BK{i}")
        record_platform_charge(
            db, company_id=company.id, booking_id=booking.id,
            basis_amount=420.0, commission_percent=8.0, charge_amount=33.60,
        )
    db.commit()
    accrue_subscription(db, company)

    statement = company_statement(db, company)

    assert statement["commission"]["booking_count"] == 2
    assert statement["commission"]["total"] == 67.20
    assert statement["subscription"]["total"] == 349.0
    assert statement["total_due"] == 416.20


def test_a_statement_for_a_quiet_month_is_zero_not_an_error(db):
    company = _school(db)
    statement = company_statement(db, company)

    assert statement["total_due"] == 0.0
    assert statement["commission"]["booking_count"] == 0


def test_platform_revenue_is_commission_not_lesson_volume(db):
    """The distinction the old revenue screen got wrong."""
    company = _school(db, subscription=349.0)
    _teacher(db, company, "a@x.com")
    booking = _booking(db, company=company, amount=420.0)
    record_platform_charge(
        db, company_id=company.id, booking_id=booking.id,
        basis_amount=420.0, commission_percent=8.0, charge_amount=33.60,
    )
    db.commit()
    accrue_subscription(db, company)

    revenue = platform_revenue(db)

    # Not the R420 the student paid — the platform keeps R33.60 plus the seat fee.
    assert revenue["commission_total"] == 33.60
    assert revenue["subscription_total"] == 349.0
    assert revenue["total"] == 382.60


def test_platform_revenue_lists_the_biggest_earners_first(db):
    big = _school(db, name="Big")
    small = _school(db, name="Small")
    for i, (company, amount) in enumerate([(big, 100.0), (small, 10.0)]):
        booking = _booking(db, company=company, ref=f"R{i}")
        record_platform_charge(
            db, company_id=company.id, booking_id=booking.id,
            basis_amount=1000.0, commission_percent=8.0, charge_amount=amount,
        )
    db.commit()

    rows = platform_revenue(db)["companies"]

    assert [row["company_name"] for row in rows] == ["Big", "Small"]


def test_charges_are_scoped_to_their_billing_period(db):
    company = _school(db)
    booking = _booking(db, company=company)
    record_platform_charge(
        db, company_id=company.id, booking_id=booking.id,
        basis_amount=420.0, commission_percent=8.0, charge_amount=33.60,
    )
    db.commit()

    assert company_statement(db, company, period="1999-01")["total_due"] == 0.0
    assert company_statement(db, company)["total_due"] == 33.60
