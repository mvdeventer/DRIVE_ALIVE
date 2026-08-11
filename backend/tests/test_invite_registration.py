"""Registering straight from a school's invitation link.

The one-step path: an invitee with no account clicks the link, registers, and
comes out the far side already a member of the school on the agreed terms.

The invitation is the source of truth for which school and which markup — a
caller must not be able to substitute either through the request body.
"""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# app/routes/__init__.py must settle before app modules are imported directly.
import app.routes  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.models.company import Company
from app.models.company_invite import CompanyInstructorInvite, InviteStatus
from app.models.user import (
    Instructor,
    InstructorVerificationStatus,
    User,
    UserRole,
    UserStatus,
)

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


def _school(db, name="Alpha Driving"):
    company = Company(name=name, slug=name.lower().replace(" ", "-"))
    db.add(company)
    db.commit()
    return company


def _invite(db, company, email, *, markup_type="percent", markup_value=20.0, days=7):
    invite = CompanyInstructorInvite(
        company_id=company.id,
        direction="invite",
        email=email,
        token=CompanyInstructorInvite.generate_token(),
        status=InviteStatus.PENDING.value,
        proposed_markup_type=markup_type,
        proposed_markup_value=markup_value,
        expires_at=datetime.now(timezone.utc) + timedelta(days=days),
    )
    db.add(invite)
    db.commit()
    return invite


def _payload(**overrides):
    body = {
        "email": "newcomer@example.com",
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


def test_registering_with_an_invitation_joins_the_school_in_one_step(client, db):
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com")

    response = client.post(
        "/auth/register/instructor",
        json=_payload(invite_token=invite.token),
    )

    assert response.status_code == 201, response.text
    instructor = db.query(Instructor).one()
    assert instructor.company_id == company.id
    assert instructor.company_joined_at is not None


def test_the_agreed_markup_comes_across_with_them(client, db):
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com", markup_value=25.0)

    client.post("/auth/register/instructor", json=_payload(invite_token=invite.token))

    instructor = db.query(Instructor).one()
    assert instructor.company_markup_type == "percent"
    assert instructor.company_markup_value == 25.0


def test_the_invitation_is_closed_rather_than_left_pending(client, db):
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com")

    client.post("/auth/register/instructor", json=_payload(invite_token=invite.token))

    db.refresh(invite)
    assert invite.status == InviteStatus.ACCEPTED.value
    assert invite.instructor_id == db.query(Instructor).one().id


def test_only_the_admin_check_remains(client, db):
    """The invitation is the school's approval, so there is no second one."""
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com")

    client.post("/auth/register/instructor", json=_payload(invite_token=invite.token))

    instructor = db.query(Instructor).one()
    assert (
        instructor.verification_status
        == InstructorVerificationStatus.PENDING_ADMIN.value
    )


def test_the_school_comes_from_the_invitation_not_the_request_body(client, db):
    """A caller must not be able to redirect an invitation to another school."""
    invited_by = _school(db, "Alpha Driving")
    other = _school(db, "Rival Driving")
    invite = _invite(db, invited_by, "newcomer@example.com")

    client.post(
        "/auth/register/instructor",
        json=_payload(invite_token=invite.token, company_id=other.id),
    )

    assert db.query(Instructor).one().company_id == invited_by.id


def test_an_invitation_for_a_different_email_is_refused(client, db):
    company = _school(db)
    invite = _invite(db, company, "someone.else@example.com")

    response = client.post(
        "/auth/register/instructor",
        json=_payload(invite_token=invite.token),
    )

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INVITE_NOT_FOR_YOU"
    assert db.query(Instructor).count() == 0


def test_an_expired_invitation_is_refused(client, db):
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com", days=-1)

    response = client.post(
        "/auth/register/instructor",
        json=_payload(invite_token=invite.token),
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVITE_NOT_OPEN"
    assert db.query(Instructor).count() == 0


def test_an_unknown_token_is_refused(client, db):
    response = client.post(
        "/auth/register/instructor",
        json=_payload(invite_token="not-a-real-token"),
    )

    assert response.status_code == 404
    assert db.query(Instructor).count() == 0


def test_an_invitation_cannot_also_create_a_school(client, db):
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com")

    response = client.post(
        "/auth/register/instructor",
        json=_payload(invite_token=invite.token, company_name="Sneaky School"),
    )

    assert response.status_code == 422
    assert db.query(Company).count() == 1


def test_registering_without_an_invitation_is_unaffected(client, db):
    """The ordinary independent path must keep working.

    They are not joined to any school — but they are not company-less either:
    independents trade as their own one-person business so that their lessons
    still earn the platform its commission.
    """
    response = client.post("/auth/register/instructor", json=_payload())

    assert response.status_code == 201, response.text
    instructor = db.query(Instructor).one()
    own = db.query(Company).filter(Company.id == instructor.company_id).one()
    assert own.is_solo is True
    assert own.name == "Sipho Dlamini"
