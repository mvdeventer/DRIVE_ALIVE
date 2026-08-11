"""The platform host company: the school that operates the platform.

Exactly one company carries ``is_platform_host``. It owns the commission rate
and, from Phase 5, receives the charges every other school accrues.

These run against a real in-memory SQLite database rather than mocks, because
the behaviour under test is largely SQL: the partial unique index that permits
only one host, and the idempotency of the startup backfill.
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# app/routes/__init__.py must settle before app modules are imported directly.
import app.routes  # noqa: F401
from app.database import Base
from app.models.company import Company
from app.models.company_admin import CompanyAdmin
from app.models.user import User, UserRole, UserStatus
from app.services.company_service import (
    DEFAULT_HOST_COMPANY_NAME,
    ensure_platform_host_company,
    get_platform_host_company,
)


@pytest.fixture
def db():
    # StaticPool + check_same_thread keeps the one in-memory database alive
    # across connections and usable from TestClient's worker thread.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )
    Base.metadata.create_all(bind=engine)
    # Mirrors the partial unique index created by _apply_incremental_migrations.
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


def _admin(db, email="admin@example.com", commission=None):
    user = User(
        email=email,
        phone="+27611154598",
        password_hash="x",
        first_name="Plat",
        last_name="Operator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
        commission_percent=commission,
    )
    db.add(user)
    db.commit()
    return user


def test_creates_host_company_owned_by_the_admin(db):
    admin = _admin(db)

    host = ensure_platform_host_company(db)
    db.commit()

    assert host is not None
    assert host.is_platform_host is True
    assert host.owner_user_id == admin.id
    assert host.billing_email == admin.email
    assert host.name == DEFAULT_HOST_COMPANY_NAME
    assert host.slug  # slugified, non-empty


def test_admin_becomes_administrator_of_the_host_company(db):
    admin = _admin(db)

    host = ensure_platform_host_company(db)
    db.commit()

    profile = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == admin.id).one()
    assert profile.company_id == host.id
    assert profile.is_primary is True


def test_carries_the_existing_commission_rate_across(db):
    """Moving the source of truth must not silently change the rate in force."""
    _admin(db, commission=12.5)

    host = ensure_platform_host_company(db)
    db.commit()

    assert host.platform_commission_percent == 12.5


def test_is_idempotent_across_repeated_boots(db):
    _admin(db)

    first = ensure_platform_host_company(db)
    db.commit()
    second = ensure_platform_host_company(db)
    db.commit()
    third = ensure_platform_host_company(db)
    db.commit()

    assert first.id == second.id == third.id
    assert db.query(Company).count() == 1
    assert db.query(CompanyAdmin).count() == 1


def test_returns_none_before_the_system_is_set_up(db):
    """With no admin there is nobody to own the host company."""
    assert ensure_platform_host_company(db) is None
    assert db.query(Company).count() == 0


def test_picks_the_lowest_id_admin_as_owner(db):
    first = _admin(db, email="first@example.com")
    _admin(db, email="second@example.com")

    host = ensure_platform_host_company(db)
    db.commit()

    assert host.owner_user_id == first.id


def test_explicit_name_is_used_when_supplied(db):
    _admin(db)

    host = ensure_platform_host_company(db, name="Cape Town Driving Co")
    db.commit()

    assert host.name == "Cape Town Driving Co"
    assert host.slug == "cape-town-driving-co"


def test_does_not_duplicate_an_existing_company_admin_profile(db):
    """An admin who already administers a school keeps that profile."""
    admin = _admin(db)
    other = Company(name="Other School", slug="other-school")
    db.add(other)
    db.commit()
    db.add(CompanyAdmin(user_id=admin.id, company_id=other.id, is_primary=True))
    db.commit()

    ensure_platform_host_company(db)
    db.commit()

    profiles = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == admin.id).all()
    assert len(profiles) == 1
    assert profiles[0].company_id == other.id


def test_a_second_host_company_is_rejected_by_the_database(db):
    """The single-host rule is enforced by an index, not by convention."""
    _admin(db)
    ensure_platform_host_company(db)
    db.commit()

    db.add(Company(name="Impostor", slug="impostor", is_platform_host=True))
    with pytest.raises(IntegrityError):
        db.commit()


def test_initial_setup_creates_admin_and_host_company_together(db):
    """A fresh install must come up with a host company already in place.

    Exercises the route, not just the service, because the ordering there
    matters: the admin is flushed for its id, then the company is created, then
    a single commit covers both.
    """
    from fastapi.testclient import TestClient

    from app.database import get_db
    from app.main import app

    app.dependency_overrides[get_db] = lambda: db
    try:
        client = TestClient(app, raise_server_exceptions=False)
        response = client.post(
            "/setup/create-initial-admin",
            json={
                "email": "operator@example.com",
                "phone": "+27611154598",
                "password": "Str0ng!Passw0rd",
                "first_name": "Plat",
                "last_name": "Operator",
                "id_number": "7901175104084",
                "company_name": "RoadReady HQ",
            },
        )
    finally:
        app.dependency_overrides.pop(get_db, None)

    assert response.status_code == 201, response.text
    assert response.json()["host_company"]["name"] == "RoadReady HQ"

    host = get_platform_host_company(db)
    assert host is not None
    assert host.is_platform_host is True

    admin = db.query(User).filter(User.email == "operator@example.com").one()
    assert host.owner_user_id == admin.id
    profile = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == admin.id).one()
    assert profile.company_id == host.id


def test_non_host_companies_are_unconstrained(db):
    """The index is partial: any number of ordinary schools may coexist."""
    _admin(db)
    ensure_platform_host_company(db)
    db.commit()

    db.add(Company(name="School A", slug="school-a"))
    db.add(Company(name="School B", slug="school-b"))
    db.commit()

    assert db.query(Company).count() == 3
    assert get_platform_host_company(db).name == DEFAULT_HOST_COMPANY_NAME
