"""Independent instructors trade as a one-person business.

Without one, registering independently was a way to use the marketplace for
free: no company meant no commission. Giving every unattached instructor a
company of their own closes that and keeps a single billing path.

The interesting cases are the joins and departures, where a one-person
business and a real school meet.
"""

import pytest
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.routes  # noqa: F401  — settle package imports before app modules
from app.database import Base
from app.models.company import Company
from app.models.company_admin import CompanyAdmin
from app.models.user import Instructor, User, UserRole, UserStatus
from app.services.company_service import (
    ensure_solo_company,
    promote_solo_to_school,
    retire_solo_company,
)
from app.services.recruitment_service import assert_instructor_can_join


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


def _instructor(db, email="solo@example.com", first="Thabo", last="Nkosi"):
    user = User(
        email=email,
        phone="+27600000001",
        password_hash="x",
        first_name=first,
        last_name=last,
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    instructor = Instructor(
        user_id=user.id,
        id_number="8505125800082",
        license_number="LIC-1",
        license_types="B",
        vehicle_registration="CA12345",
        vehicle_make="Toyota",
        vehicle_model="Corolla",
        vehicle_year=2021,
        hourly_rate=400.0,
    )
    db.add(instructor)
    db.flush()
    return user, instructor


def test_an_independent_instructor_gets_a_company_of_their_own(db):
    user, instructor = _instructor(db)

    company = ensure_solo_company(db, user, instructor)

    assert company.is_solo is True
    assert instructor.company_id == company.id


def test_it_is_named_after_them(db):
    user, instructor = _instructor(db, first="Thabo", last="Nkosi")
    assert ensure_solo_company(db, user, instructor).name == "Thabo Nkosi"


def test_they_can_see_what_they_owe(db):
    """They are being billed now, so they need the statement that says so."""
    user, instructor = _instructor(db)

    ensure_solo_company(db, user, instructor)

    profile = db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).one()
    assert profile.is_primary is True


def test_no_roster_fee_for_a_business_with_no_roster(db):
    user, instructor = _instructor(db)
    company = ensure_solo_company(db, user, instructor)
    assert company.subscription_price_per_instructor == 0.0


def test_no_markup_is_applied_to_their_own_rate(db):
    """There is nobody to hide a margin from."""
    user, instructor = _instructor(db)
    ensure_solo_company(db, user, instructor)
    assert instructor.company_markup_type is None
    assert instructor.company_markup_value == 0.0


# ── Meeting a real school ────────────────────────────────────────────────


def test_owning_a_one_person_business_does_not_block_joining_a_school(db):
    """Every independent has one, so it must not read as 'already employed'."""
    user, instructor = _instructor(db)
    ensure_solo_company(db, user, instructor)
    db.flush()

    assert assert_instructor_can_join(instructor) is instructor


def test_belonging_to_an_actual_school_still_blocks_joining_another(db):
    user, instructor = _instructor(db)
    school = Company(name="Alpha Driving", slug="alpha", is_solo=False)
    db.add(school)
    db.flush()
    instructor.company_id = school.id
    db.flush()

    with pytest.raises(Exception) as excinfo:
        assert_instructor_can_join(instructor)
    assert excinfo.value.detail["code"] == "INSTRUCTOR_ALREADY_IN_COMPANY"


def test_an_unresolvable_company_fails_closed(db):
    """Better to refuse a legitimate move than to wave through a forbidden one."""
    _user, instructor = _instructor(db)
    instructor.company_id = 4242  # nothing loads for this

    with pytest.raises(Exception) as excinfo:
        assert_instructor_can_join(instructor)
    assert excinfo.value.detail["code"] == "INSTRUCTOR_ALREADY_IN_COMPANY"


def test_joining_a_school_stands_down_their_own_business(db):
    user, instructor = _instructor(db)
    solo = ensure_solo_company(db, user, instructor)
    db.flush()

    retire_solo_company(db, instructor)
    db.flush()

    assert solo.is_active is False
    assert db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).count() == 0


def test_the_retired_company_is_kept_because_charges_point_at_it(db):
    user, instructor = _instructor(db)
    solo = ensure_solo_company(db, user, instructor)
    db.flush()
    solo_id = solo.id

    retire_solo_company(db, instructor)
    db.flush()

    assert db.query(Company).filter(Company.id == solo_id).one() is not None


def test_going_independent_again_reclaims_the_same_business(db):
    """Their history follows them rather than stranding on an orphan row."""
    user, instructor = _instructor(db)
    original = ensure_solo_company(db, user, instructor)
    original_id = original.id
    db.flush()
    retire_solo_company(db, instructor)
    db.flush()

    reinstated = ensure_solo_company(db, user, instructor)

    assert reinstated.id == original_id
    assert reinstated.is_active is True
    assert db.query(Company).filter(Company.is_solo.is_(True)).count() == 1


def test_a_one_person_business_that_hires_becomes_a_school(db):
    """Left solo it would skip the break-even guard while running a roster."""
    user, instructor = _instructor(db)
    company = ensure_solo_company(db, user, instructor)

    promote_solo_to_school(company)

    assert company.is_solo is False


def test_promoting_a_real_school_changes_nothing(db):
    school = Company(name="Alpha", slug="alpha-2", is_solo=False)
    promote_solo_to_school(school)
    assert school.is_solo is False
