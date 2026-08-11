"""The company-admin pricing surface.

A school sets a markup per instructor. Because commission is charged on the
gross student price rather than on the margin, a thin markup costs the school
more than it earns — so the editor refuses to save one.
"""

from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

# app/routes/__init__.py must settle before app modules are imported directly.
import app.routes  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.middleware.company import CompanyContext, require_company_admin
from app.models.company import Company
from app.models.user import Instructor, User, UserRole, UserStatus


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


def _school(db, *, is_host=False, commission=8.0):
    company = Company(
        name="Test School",
        slug=f"test-school-{int(is_host)}",
        is_platform_host=is_host,
        platform_commission_percent=commission,
    )
    db.add(company)
    db.commit()
    return company


def _instructor(db, company, rate=350.0, email="teach@school.com"):
    user = User(
        email=email,
        phone="+27611154500",
        password_hash="x",
        first_name="Sipho",
        last_name="Dlamini",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.commit()
    instructor = Instructor(
        user_id=user.id,
        license_number=f"LIC{user.id}",
        license_types="B",
        id_number=f"790117510408{user.id}",
        vehicle_registration="CA123",
        vehicle_make="Toyota",
        vehicle_model="Corolla",
        vehicle_year=2020,
        hourly_rate=rate,
        company_id=company.id,
    )
    db.add(instructor)
    db.commit()
    return instructor


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(require_company_admin, None)


def _act_as_admin_of(company, db):
    """Authorize as this school's administrator.

    Overrides the dependency rather than logging in, so these tests exercise
    the pricing rules rather than the auth stack, which has its own suite.
    """
    admin = SimpleNamespace(id=999, email="admin@school.com")
    app.dependency_overrides[require_company_admin] = lambda: CompanyContext(
        user=admin, company_id=company.id, company=company, is_primary=True
    )


def test_pricing_lists_the_schools_instructors_with_their_margin(client, db):
    company = _school(db)
    _instructor(db, company)
    _act_as_admin_of(company, db)

    body = client.get("/company/pricing").json()

    assert body["commission_percent"] == 8.0
    assert len(body["instructors"]) == 1
    pricing = body["instructors"][0]["pricing"]
    assert pricing["instructor_base"] == 350.0
    assert pricing["company_markup"] == 0.0
    assert pricing["student_pays"] == 350.0


def test_break_even_ratio_is_published_for_the_editor(client, db):
    company = _school(db)
    _act_as_admin_of(company, db)

    assert client.get("/company/pricing").json()["break_even_markup_ratio"] == 0.08696


def test_setting_a_healthy_markup_updates_the_student_price(client, db):
    company = _school(db)
    instructor = _instructor(db, company)
    _act_as_admin_of(company, db)

    response = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "percent", "markup_value": 20.0},
    )

    assert response.status_code == 200, response.text
    pricing = response.json()["pricing"]
    assert pricing["student_pays"] == 420.0
    assert pricing["company_markup"] == 70.0
    assert pricing["platform_charge"] == 33.60
    assert pricing["company_net"] == 36.40


def test_a_loss_making_markup_is_refused(client, db):
    """5% is under the ~8.7% break-even, so the school would pay to work."""
    company = _school(db)
    instructor = _instructor(db, company)
    _act_as_admin_of(company, db)

    response = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "percent", "markup_value": 5.0},
    )

    assert response.status_code == 400
    detail = response.json()["detail"]
    assert detail["code"] == "MARKUP_BELOW_BREAK_EVEN"
    assert detail["company_net"] < 0
    # And nothing was saved.
    db.refresh(instructor)
    assert instructor.company_markup_type is None


def test_the_refusal_says_what_would_be_enough(client, db):
    company = _school(db)
    instructor = _instructor(db, company)
    _act_as_admin_of(company, db)

    detail = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "amount", "markup_value": 10.0},
    ).json()["detail"]

    # R350 x 0.08/0.92 = R30.43 an hour.
    assert detail["minimum_markup_amount_per_hour"] == 30.43


def test_a_markup_exactly_at_break_even_is_allowed(client, db):
    company = _school(db)
    instructor = _instructor(db, company)
    _act_as_admin_of(company, db)

    response = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "amount", "markup_value": 30.43},
    )

    assert response.status_code == 200, response.text
    assert response.json()["pricing"]["company_net"] >= 0


def test_the_host_company_may_set_any_markup(client, db):
    """It pays no commission, so no markup can lose it money."""
    company = _school(db, is_host=True)
    instructor = _instructor(db, company)
    _act_as_admin_of(company, db)

    response = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "percent", "markup_value": 1.0},
    )

    assert response.status_code == 200, response.text
    assert response.json()["pricing"]["platform_charge"] == 0.0


def test_clearing_a_markup_is_always_allowed(client, db):
    company = _school(db)
    instructor = _instructor(db, company)
    instructor.company_markup_type = "percent"
    instructor.company_markup_value = 20.0
    db.commit()
    _act_as_admin_of(company, db)

    response = client.put(
        f"/company/instructors/{instructor.id}/markup",
        json={"markup_type": "none"},
    )

    assert response.status_code == 200, response.text
    db.refresh(instructor)
    assert instructor.company_markup_type is None
    assert instructor.company_markup_value == 0.0


def test_cannot_price_an_instructor_at_another_school(client, db):
    """The scoping rule: authority comes from the caller's own company."""
    mine = _school(db)
    theirs = Company(name="Rival", slug="rival")
    db.add(theirs)
    db.commit()
    outsider = _instructor(db, theirs, email="rival@school.com")
    _act_as_admin_of(mine, db)

    response = client.put(
        f"/company/instructors/{outsider.id}/markup",
        json={"markup_type": "percent", "markup_value": 50.0},
    )

    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "INSTRUCTOR_NOT_IN_COMPANY"
    db.refresh(outsider)
    assert outsider.company_markup_type is None


def test_pricing_only_lists_the_callers_own_instructors(client, db):
    mine = _school(db)
    theirs = Company(name="Rival", slug="rival")
    db.add(theirs)
    db.commit()
    _instructor(db, mine, email="mine@school.com")
    _instructor(db, theirs, email="theirs@school.com")
    _act_as_admin_of(mine, db)

    body = client.get("/company/pricing").json()

    assert [row["email"] for row in body["instructors"]] == ["mine@school.com"]
