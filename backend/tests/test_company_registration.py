"""Registering a driving school.

Previously the only way to create a school was to register as an instructor
with a company name attached, which forced school owners to invent a licence
number and a vehicle. A school and the person who administers it are now
created together, and that person is not an instructor.
"""

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
from app.models.company_admin import CompanyAdmin
from app.models.user import Instructor, User, UserRole, UserStatus
from app.services.company_service import resolve_managed_company_id
from app.utils.auth import get_password_hash

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
    # Registration refuses to run on an uninitialised system.
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
    # The route is rate limited to 3/hour per IP; every test here shares one
    # in-memory limiter and one client address, so leave it off.
    from app.utils.rate_limiter import limiter

    was_enabled = limiter.enabled
    limiter.enabled = False
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        limiter.enabled = was_enabled
        app.dependency_overrides.pop(get_db, None)


def _payload(**overrides):
    body = {
        "email": "owner@school.com",
        "phone": "+27611154598",
        "first_name": "Thandi",
        "last_name": "Nkosi",
        "password": PASSWORD,
        "accept_terms": True,
        "company_name": "Cape Town Driving Academy",
    }
    body.update(overrides)
    return body


def test_registers_a_school_and_its_administrator(client, db):
    response = client.post("/auth/register/company", json=_payload())

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["company_name"] == "Cape Town Driving Academy"

    user = db.query(User).filter(User.email == "owner@school.com").one()
    assert user.role == UserRole.COMPANY_ADMIN
    company = db.query(Company).filter(Company.id == body["company_id"]).one()
    assert company.owner_user_id == user.id
    assert company.is_platform_host is False
    profile = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).one()
    assert profile.company_id == company.id
    assert profile.is_primary is True


def test_administrator_is_not_an_instructor(client, db):
    """The whole point: no licence, no vehicle, no instructor profile."""
    client.post("/auth/register/company", json=_payload())

    user = db.query(User).filter(User.email == "owner@school.com").one()
    assert db.query(Instructor).filter(Instructor.user_id == user.id).first() is None


def test_new_account_starts_inactive_pending_verification(client, db):
    response = client.post("/auth/register/company", json=_payload())

    assert response.json()["requires_verification"] is True
    user = db.query(User).filter(User.email == "owner@school.com").one()
    assert user.status == UserStatus.INACTIVE


def test_cannot_register_a_second_school_on_the_same_email(client, db):
    client.post("/auth/register/company", json=_payload())

    response = client.post(
        "/auth/register/company", json=_payload(company_name="Another School")
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "COMPANY_ADMIN_ALREADY_EXISTS"
    assert db.query(Company).count() == 1


def test_existing_account_may_add_a_school_with_the_right_password(client, db):
    """A student or instructor can also come to run a school."""
    db.add(
        User(
            email="owner@school.com",
            phone="+27611154598",
            password_hash=get_password_hash(PASSWORD),
            first_name="Thandi",
            last_name="Nkosi",
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
        )
    )
    db.commit()

    response = client.post("/auth/register/company", json=_payload())

    assert response.status_code == 201, response.text
    # An account that already works must not be deactivated by gaining a role.
    user = db.query(User).filter(User.email == "owner@school.com").one()
    assert user.status == UserStatus.ACTIVE
    assert response.json()["requires_verification"] is False


def test_existing_account_with_the_wrong_password_is_refused(client, db):
    db.add(
        User(
            email="owner@school.com",
            phone="+27611154598",
            password_hash=get_password_hash("A-Different!Pass1"),
            first_name="Thandi",
            last_name="Nkosi",
            role=UserRole.STUDENT,
            status=UserStatus.ACTIVE,
        )
    )
    db.commit()

    response = client.post("/auth/register/company", json=_payload())

    assert response.status_code == 401
    assert db.query(Company).count() == 0


def test_cannot_request_the_platform_admin_role(client, db):
    """Registration must not be a route to becoming the platform operator."""
    response = client.post("/auth/register/company", json=_payload(role="admin"))

    assert response.status_code == 422
    assert db.query(User).filter(User.email == "owner@school.com").first() is None


def test_school_registered_is_not_the_platform_host(client, db):
    client.post("/auth/register/company", json=_payload())

    hosts = db.query(Company).filter(Company.is_platform_host.is_(True)).all()
    assert hosts == []


def test_terms_must_be_accepted(client, db):
    response = client.post("/auth/register/company", json=_payload(accept_terms=False))

    assert response.status_code == 422
    assert db.query(Company).count() == 0


def test_registration_is_atomic_when_the_company_cannot_be_created(client, db, monkeypatch):
    """A user must never be left behind without the school they registered."""
    import app.services.company_service as company_service

    def boom(*args, **kwargs):
        raise RuntimeError("slug generation failed")

    monkeypatch.setattr(company_service, "create_company", boom)

    response = client.post("/auth/register/company", json=_payload())

    assert response.status_code == 500
    assert db.query(User).filter(User.email == "owner@school.com").first() is None
    assert db.query(Company).count() == 0


# ── Authority over an existing school ─────────────────────────────────────


def _school_with_admin(db):
    company = Company(name="School", slug="school")
    db.add(company)
    db.commit()
    user = User(
        email="admin@school.com",
        phone="+27611154599",
        password_hash="x",
        first_name="A",
        last_name="B",
        role=UserRole.COMPANY_ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.add(CompanyAdmin(user_id=user.id, company_id=company.id, is_primary=True))
    db.commit()
    return company, user


def test_company_admin_has_authority_over_their_school(db):
    company, user = _school_with_admin(db)
    assert resolve_managed_company_id(db, user) == company.id


def test_legacy_instructor_owner_keeps_authority(db):
    """Schools created before company administrators existed must keep working."""
    company = Company(name="Legacy", slug="legacy")
    db.add(company)
    db.commit()
    user = User(
        email="owner@legacy.com",
        phone="+27611154597",
        password_hash="x",
        first_name="L",
        last_name="O",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.add(
        Instructor(
            user_id=user.id,
            license_number="LIC1",
            license_types="B",
            id_number="7901175104084",
            vehicle_registration="CA1",
            vehicle_make="Toyota",
            vehicle_model="Corolla",
            vehicle_year=2020,
            hourly_rate=350.0,
            company_id=company.id,
            is_company_owner=True,
        )
    )
    db.commit()

    assert resolve_managed_company_id(db, user) == company.id


def test_a_plain_instructor_has_no_authority(db):
    """Belonging to a school is not the same as running it."""
    company = Company(name="School", slug="school-2")
    db.add(company)
    db.commit()
    user = User(
        email="member@school.com",
        phone="+27611154596",
        password_hash="x",
        first_name="M",
        last_name="N",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    db.add(
        Instructor(
            user_id=user.id,
            license_number="LIC2",
            license_types="B",
            id_number="7901175104085",
            vehicle_registration="CA2",
            vehicle_make="VW",
            vehicle_model="Polo",
            vehicle_year=2021,
            hourly_rate=300.0,
            company_id=company.id,
            is_company_owner=False,
        )
    )
    db.commit()

    assert resolve_managed_company_id(db, user) is None


def test_a_user_with_no_school_has_no_authority(db):
    user = User(
        email="nobody@example.com",
        phone="+27611154595",
        password_hash="x",
        first_name="N",
        last_name="B",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()

    assert resolve_managed_company_id(db, user) is None
