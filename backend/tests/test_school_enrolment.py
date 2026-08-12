"""A school signing up its own learner, end to end.

This is what makes the mixed revenue model reachable: until a school can
record a learner as its own, every booking looks marketplace-generated and
every school pays commission on all of it.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.routes  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.middleware.company import CompanyContext, require_company_admin
from app.models.company import Company
from app.models.company_admin import CompanyAdmin
from app.models.user import Instructor, Student, User, UserRole, UserStatus
from app.services.fees import SOURCE_COMPANY, SOURCE_PLATFORM, resolve_booking_source

PASSWORD = "Str0ng!Passw0rd"


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
    session.add(
        User(
            email="platform@example.com",
            phone="+27600000000",
            password_hash="x",
            first_name="Plat",
            last_name="Operator",
            role=UserRole.ADMIN,
            status=UserStatus.ACTIVE,
        )
    )
    session.commit()
    try:
        yield session
    finally:
        session.close()


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    from app.utils.rate_limiter import limiter

    was_enabled = limiter.enabled
    limiter.enabled = False
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        limiter.enabled = was_enabled
        app.dependency_overrides.pop(get_db, None)


def _instructor_payload(**overrides):
    body = {
        "email": "independent@example.com",
        "phone": "+27611154598",
        "password": PASSWORD,
        "first_name": "Sipho",
        "last_name": "Dlamini",
        "id_number": "8505125800082",
        "license_number": "LIC-NEW-1",
        "license_types": "B",
        "vehicle_registration": "CA12345",
        "vehicle_make": "Toyota",
        "vehicle_model": "Corolla",
        "vehicle_year": 2021,
        "hourly_rate": 400,
        "service_radius_km": 20,
        "max_travel_distance_km": 50,
        "rate_per_km_beyond_radius": 5,
        "accept_terms": True,
        "schedule": [],
    }
    body.update(overrides)
    return body


def _student_payload(**overrides):
    body = {
        "email": "learner@example.com",
        "phone": "+27611154599",
        "password": PASSWORD,
        "first_name": "Lerato",
        "last_name": "Mokoena",
        "id_number": "9505125800083",
        "emergency_contact_name": "Naledi Mokoena",
        "emergency_contact_phone": "+27611154500",
        "address_line1": "1 Long Street",
        "postal_code": "8001",
        "accept_terms": True,
    }
    body.update(overrides)
    return body


# ── Independent registration ─────────────────────────────────────────────


def test_registering_independently_creates_a_one_person_business(client, db):
    response = client.post("/auth/register/instructor", json=_instructor_payload())

    assert response.status_code == 201, response.text
    instructor = db.query(Instructor).one()
    assert instructor.company_id is not None

    company = db.query(Company).filter(Company.id == instructor.company_id).one()
    assert company.is_solo is True
    assert company.name == "Sipho Dlamini"


def test_the_independent_can_reach_their_own_billing(client, db):
    client.post("/auth/register/instructor", json=_instructor_payload())

    instructor = db.query(Instructor).one()
    assert (
        db.query(CompanyAdmin)
        .filter(CompanyAdmin.user_id == instructor.user_id)
        .count()
        == 1
    )


def test_their_lessons_now_attract_commission(client, db):
    """The whole point: an independent used to generate no platform revenue."""
    client.post("/auth/register/instructor", json=_instructor_payload())

    instructor = db.query(Instructor).one()
    company = db.query(Company).filter(Company.id == instructor.company_id).one()
    marketplace_learner = Student(origin_company_id=None)

    assert resolve_booking_source(marketplace_learner, company) == SOURCE_PLATFORM


# ── School enrolment ─────────────────────────────────────────────────────


def _make_school_admin(db, email="owner@alpha.test"):
    company = Company(name="Alpha Driving", slug="alpha-driving")
    db.add(company)
    db.flush()
    user = User(
        email=email,
        phone="+27600000123",
        password_hash="x",
        first_name="Anele",
        last_name="Khumalo",
        role=UserRole.COMPANY_ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    db.add(CompanyAdmin(user_id=user.id, company_id=company.id, is_primary=True))
    db.commit()
    return company, user


def test_a_school_can_sign_up_its_own_learner(client, db):
    company, admin = _make_school_admin(db)
    app.dependency_overrides[require_company_admin] = lambda: CompanyContext(
        user=admin, company_id=company.id, company=company, is_primary=True
    )
    try:
        response = client.post("/company/students", json=_student_payload())
    finally:
        app.dependency_overrides.pop(require_company_admin, None)

    assert response.status_code == 201, response.text
    student = db.query(Student).one()
    assert student.origin_company_id == company.id


def test_that_learners_bookings_with_this_school_are_exempt(client, db):
    company, admin = _make_school_admin(db)
    learner = Student(origin_company_id=company.id)

    assert resolve_booking_source(learner, company) == SOURCE_COMPANY


def test_a_school_cannot_claim_a_learner_after_the_fact(client, db):
    """No endpoint reassigns origin — that would erase commission already due."""
    routes = [
        r.path
        for r in app.routes
        if hasattr(r, "path") and r.path.startswith("/company/students")
    ]
    methods = {
        m
        for r in app.routes
        if hasattr(r, "path")
        and r.path.startswith("/company/students")
        for m in (r.methods or set())
    }
    assert routes, "the enrolment route should exist"
    assert methods <= {"POST", "GET", "HEAD"}, methods


# ── The full decision chain, end to end ──────────────────────────────────
#
# Route composition is: resolve_booking_source -> calculate_platform_charge
# -> record_platform_charge. Each link is unit-tested; these two check that
# the links joined together produce the right money.


def _charge_for(db, student, company, instructor_rate=400.0, minutes=60):
    """Run the same three steps a booking route runs, and return the row."""
    from app.models.booking import Booking, BookingStatus, PaymentStatus
    from app.services.billing_service import record_platform_charge
    from app.services.fees import calculate_platform_charge, resolve_student_price

    # A real row: bookings point at an instructor, and the database is
    # entitled to insist that the instructor exists.
    teacher_user = User(
        email="charged-teacher@example.com",
        phone="+27600000777",
        password_hash="x",
        first_name="Tumi",
        last_name="Sithole",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(teacher_user)
    db.flush()
    instructor = Instructor(
        user_id=teacher_user.id,
        id_number="8505125800099",
        license_number="LIC-CHG",
        license_types="B",
        vehicle_registration="CA99999",
        vehicle_make="Toyota",
        vehicle_model="Corolla",
        vehicle_year=2021,
        hourly_rate=instructor_rate,
        company_id=company.id if company else None,
    )
    db.add(instructor)
    db.flush()
    _base, _markup, student_total = resolve_student_price(instructor, minutes)

    source = resolve_booking_source(student, company)
    charge_amount = calculate_platform_charge(
        student_total,
        8.0,
        booking_source=source,
        is_platform_host=bool(company and company.is_platform_host),
        has_company=company is not None,
    )

    booking = Booking(
        booking_reference="BK-TEST-1",
        student_id=student.id,
        instructor_id=instructor.id,
        lesson_date=datetime.now(timezone.utc) + timedelta(days=1),
        duration_minutes=minutes,
        lesson_type="standard",
        pickup_latitude=-33.9249,
        pickup_longitude=18.4241,
        pickup_address="1 Long Street, Cape Town",
        amount=student_total,
        booking_source=source,
        company_id=company.id if company else None,
        status=BookingStatus.PENDING,
        payment_status=PaymentStatus.PENDING,
    )
    db.add(booking)
    db.flush()

    return source, record_platform_charge(
        db,
        company_id=company.id if company else None,
        booking_id=booking.id,
        basis_amount=student_total,
        commission_percent=8.0,
        charge_amount=charge_amount,
    )


def test_a_marketplace_learner_produces_a_commission_charge(db):
    company, _admin = _make_school_admin(db)
    student = Student(
        user_id=1,
        id_number="9505125800083",
        emergency_contact_name="N",
        emergency_contact_phone="+27600000009",
        address_line1="1 Long Street",
        postal_code="8001",
        origin_company_id=None,
    )
    db.add(student)
    db.flush()

    source, charge = _charge_for(db, student, company)

    assert source == SOURCE_PLATFORM
    assert charge is not None
    assert charge.charge_amount == 32.0  # 8% of R400


def test_a_school_enrolled_learner_produces_none(db):
    company, _admin = _make_school_admin(db)
    student = Student(
        user_id=1,
        id_number="9505125800083",
        emergency_contact_name="N",
        emergency_contact_phone="+27600000009",
        address_line1="1 Long Street",
        postal_code="8001",
        origin_company_id=company.id,
    )
    db.add(student)
    db.flush()

    source, charge = _charge_for(db, student, company)

    assert source == SOURCE_COMPANY
    assert charge is None
    from app.models.company_charge import CompanyPlatformCharge

    assert db.query(CompanyPlatformCharge).count() == 0
