"""Nothing is reachable anonymously unless it was meant to be.

Marked ``enforce_authentication_gate``, so unlike the rest of the suite
these run against the real gate rather than the conftest bypass.

The test that matters most is the last one: it walks every route the
application exposes and fails if one is neither on the public allowlist nor
protected. A new endpoint that forgets its guard breaks the build instead of
being discovered later by someone else.
"""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy.orm import sessionmaker

import app.routes  # noqa: F401
from app.database import get_db
from app.main import app
from app.middleware.public_routes import FIRST_RUN_ONLY_ROUTES, PUBLIC_ROUTES
from app.models.user import Student, User, UserRole, UserStatus
from app.utils.auth import get_password_hash

pytestmark = pytest.mark.enforce_authentication_gate

PASSWORD = "Str0ng!Passw0rd"


@pytest.fixture
def db(db_engine):
    session = sessionmaker(bind=db_engine)()
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


def _admin(db):
    admin = User(
        email="admin@example.com",
        phone="+27600000000",
        password_hash=get_password_hash(PASSWORD),
        first_name="Plat",
        last_name="Operator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()
    return admin


def _learner(db):
    user = User(
        email="learner@example.com",
        phone="+27600000002",
        password_hash=get_password_hash(PASSWORD),
        first_name="Lerato",
        last_name="Mokoena",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db.add(user)
    db.flush()
    student = Student(
        user_id=user.id,
        id_number="9505125800083",
        emergency_contact_name="Naledi",
        emergency_contact_phone="+27600000003",
        address_line1="1 Long Street",
        postal_code="8001",
    )
    db.add(student)
    db.commit()
    return student


# ── The endpoints this was written for ───────────────────────────────────


def test_learner_personal_details_are_not_public(client, db):
    """ID number, home address and next of kin, once readable by anyone."""
    student = _learner(db)

    response = client.get(f"/students/{student.id}")

    assert response.status_code == 401


def test_learners_cannot_be_enumerated_by_counting(client, db):
    _learner(db)
    assert client.get("/students/by-user/1").status_code == 401


def test_instructor_lookup_by_user_is_not_public(client, db):
    """Returned hourly_rate and id_number to anyone who asked."""
    assert client.get("/instructors/by-user/1").status_code == 401


def test_smtp_credentials_cannot_be_overwritten_anonymously(client, db):
    """The worst of them: this endpoint writes what it is given to the admin
    row, so leaving it open let anyone repoint the platform's outgoing mail
    and collect everybody's password-reset links."""
    _admin(db)

    response = client.post(
        "/verify/test-email",
        json={
            "smtp_email": "attacker@evil.test",
            "smtp_password": "hunter2",
            "verification_link_validity_minutes": 30,
        },
    )

    assert response.status_code in (401, 403)
    db.refresh(_admin_row := db.query(User).filter(User.role == UserRole.ADMIN).one())
    assert _admin_row.smtp_email != "attacker@evil.test"


def test_twilio_credentials_cannot_be_used_anonymously(client, db):
    _admin(db)
    response = client.post(
        "/verify/test-whatsapp",
        json={"phone": "+27600000123"},
    )
    assert response.status_code in (401, 403)


def test_the_setup_wizard_still_works_before_there_is_an_admin(client, db):
    """Those two are how the first-run wizard proves the operator's details,
    so they must stay open until there is somebody to authenticate as."""
    response = client.post(
        "/verify/test-email",
        json={
            "smtp_email": "operator@example.com",
            "smtp_password": "irrelevant",
            "verification_link_validity_minutes": 30,
        },
    )

    # It will fail to reach an SMTP server; what matters is that the gate
    # let it through rather than refusing it.
    assert response.status_code not in (401, 403)


# ── Things that must not have been broken ────────────────────────────────


def test_you_can_still_reach_the_login_endpoint(client, db):
    _admin(db)
    response = client.post(
        "/auth/login", json={"email": "admin@example.com", "password": PASSWORD}
    )
    assert response.status_code != 401


def test_health_is_still_open(client):
    assert client.get("/health").status_code == 200


def test_browsing_instructors_still_works_signed_out(client):
    assert client.get("/instructors/").status_code == 200


def test_registration_is_still_open(client, db):
    """A 401 here would mean nobody could ever join."""
    response = client.post("/auth/register/student", json={})
    assert response.status_code != 401  # 422 for the empty body is fine


# ── The rule itself ──────────────────────────────────────────────────────

AUTHORISATION_DEPENDENCIES = {
    "get_current_user",
    "require_admin",
    "require_company_admin",
    "get_current_active_user",
}


def _declared_dependencies(route):
    names = set()
    dependant = getattr(route, "dependant", None)
    if dependant is None:
        return names
    stack = list(dependant.dependencies)
    while stack:
        current = stack.pop()
        if current.call is not None:
            names.add(getattr(current.call, "__name__", ""))
        stack.extend(current.dependencies)
    return names


def test_every_route_is_either_allowlisted_or_protected():
    """The check that keeps this true after today.

    A new endpoint is covered by the application-wide gate automatically;
    this fails only if somebody adds one to the public allowlist without
    meaning to, or removes the gate.
    """
    allowlisted = PUBLIC_ROUTES | FIRST_RUN_ONLY_ROUTES
    unprotected = []

    for route in app.routes:
        methods = getattr(route, "methods", None)
        if not methods or not hasattr(route, "dependant"):
            continue
        guarded_by_gate = "authentication_gate" in _declared_dependencies(route)
        guarded_by_own = bool(
            _declared_dependencies(route) & AUTHORISATION_DEPENDENCIES
        )
        for method in methods:
            if method.upper() == "OPTIONS":
                continue
            if (method.upper(), route.path) in allowlisted:
                continue
            if guarded_by_gate or guarded_by_own:
                continue
            unprotected.append(f"{method} {route.path}")

    assert unprotected == []


def test_the_allowlist_has_no_entries_for_routes_that_do_not_exist():
    """A typo would silently leave the real route protected — or worse, a
    renamed route would leave a stale entry that later matches something
    else."""
    real = {
        (method.upper(), route.path)
        for route in app.routes
        for method in (getattr(route, "methods", None) or [])
    }
    stale = sorted((PUBLIC_ROUTES | FIRST_RUN_ONLY_ROUTES) - real)
    assert stale == []


# ── What the public endpoints give away ──────────────────────────────────


def test_the_public_instructor_list_reveals_no_identity_documents(client, db):
    """These endpoints are open to the internet, so whatever is in the
    response is published. An ID number is a POPIA matter, not a preference."""
    from app.models.user import Instructor

    teacher = User(
        email="teacher@example.com",
        phone="+27600000001",
        password_hash=get_password_hash(PASSWORD),
        first_name="Thabo",
        last_name="Nkosi",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
    )
    db.add(teacher)
    db.flush()
    db.add(
        Instructor(
            user_id=teacher.id,
            id_number="8505125800082",
            license_number="LIC-1",
            license_types="B",
            vehicle_registration="CA12345",
            vehicle_make="Toyota",
            vehicle_model="Corolla",
            vehicle_year=2021,
            hourly_rate=400.0,
            is_available=True,
            is_verified=True,  # the public list only shows verified instructors
        )
    )
    db.commit()

    body = client.get("/instructors/").json()
    assert body, "expected the public list to return the instructor"
    row = body[0]

    for field in ("id_number", "license_number", "vehicle_registration"):
        assert field not in row, f"{field} is published to anonymous callers"
    for field in ("hourly_rate", "platform_commission_percent"):
        assert field not in row, f"{field} would expose the school's margin"
    # Still useful, still harmless: learners search on the car.
    assert row["vehicle_make"] == "Toyota"
