"""Joining and leaving a driving school.

An instructor belongs to at most one school. That is structural —
``Instructor.company_id`` is a single column — but two schools can invite the
same person, so the acceptance path re-checks inside the transaction. These
tests cover that race, the verification interaction, and the markup handover.
"""

from datetime import datetime, timedelta, timezone
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, text
from sqlalchemy.orm import object_session, sessionmaker
from sqlalchemy.pool import StaticPool

# app/routes/__init__.py must settle before app modules are imported directly.
import app.routes  # noqa: F401
from app.database import Base, get_db
from app.main import app
from app.middleware.company import CompanyContext, require_company_admin
from app.models.company import Company
from app.services.company_service import ensure_solo_company
from app.models.company_invite import (
    CompanyInstructorInvite,
    InviteDirection,
    InviteStatus,
)
from app.models.user import (
    Instructor,
    InstructorVerificationStatus,
    User,
    UserRole,
    UserStatus,
)
from app.routes.auth import get_current_user
from app.services.recruitment_service import expire_stale_invites


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


@pytest.fixture
def client(db):
    app.dependency_overrides[get_db] = lambda: db
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        for dep in (get_db, require_company_admin, get_current_user):
            app.dependency_overrides.pop(dep, None)


def _school(db, name="Alpha Driving", commission=8.0):
    company = Company(
        name=name,
        slug=name.lower().replace(" ", "-"),
        platform_commission_percent=commission,
    )
    db.add(company)
    db.commit()
    return company


def _teacher(db, email="teach@example.com", rate=350.0, verification=None, company=None):
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
        id_number=f"790117510{user.id:04d}",
        vehicle_registration="CA123",
        vehicle_make="Toyota",
        vehicle_model="Corolla",
        vehicle_year=2020,
        hourly_rate=rate,
        verification_status=verification,
        company_id=company.id if company else None,
    )
    db.add(instructor)
    db.commit()
    return user, instructor


def _act_as_school(company):
    # A real row, not a stand-in: an invitation records who sent it, so the
    # sender has to exist for the foreign key to hold.
    db = object_session(company)
    admin = db.query(User).filter(User.email == "admin@school.com").first()
    if admin is None:
        admin = User(
            email="admin@school.com",
            phone="+27600000900",
            password_hash="x",
            first_name="School",
            last_name="Admin",
            role=UserRole.COMPANY_ADMIN,
            status=UserStatus.ACTIVE,
        )
        db.add(admin)
        db.commit()
    app.dependency_overrides[require_company_admin] = lambda: CompanyContext(
        user=admin, company_id=company.id, company=company, is_primary=True
    )


def _act_as(user):
    app.dependency_overrides[get_current_user] = lambda: user


def _invite(db, company, email, *, markup_type="percent", markup_value=20.0,
            direction=InviteDirection.INVITE.value, instructor=None,
            status_=InviteStatus.PENDING.value, expires_in_days=7):
    invite = CompanyInstructorInvite(
        company_id=company.id,
        invited_by_user_id=None,
        direction=direction,
        email=email,
        instructor_id=instructor.id if instructor else None,
        token=CompanyInstructorInvite.generate_token(),
        status=status_,
        proposed_markup_type=markup_type,
        proposed_markup_value=markup_value,
        expires_at=datetime.now(timezone.utc) + timedelta(days=expires_in_days),
    )
    db.add(invite)
    db.commit()
    return invite


# ── Sending an invitation ──────────────────────────────────────────────────


def test_a_school_can_invite_someone_with_no_account_yet(client, db):
    company = _school(db)
    _act_as_school(company)

    response = client.post(
        "/company/invites",
        json={"email": "newcomer@example.com", "markup_type": "percent", "markup_value": 20},
    )

    assert response.status_code == 201, response.text
    body = response.json()
    assert body["email"] == "newcomer@example.com"
    assert body["status"] == "pending"
    assert body["invite_link"].endswith(
        db.query(CompanyInstructorInvite).one().token
    )


def test_a_failed_email_is_reported_rather_than_assumed_sent(client, db):
    """send_simple_email returns False when SMTP is unconfigured."""
    company = _school(db)
    _act_as_school(company)

    body = client.post("/company/invites", json={"email": "a@b.com"}).json()

    assert body["email_sent"] is False
    assert "Share the link yourself" in body["warning"]


def test_cannot_invite_an_instructor_who_already_teaches_elsewhere(client, db):
    rival = _school(db, name="Rival Driving")
    company = _school(db)
    user, _ = _teacher(db, email="taken@example.com", company=rival)
    _act_as_school(company)

    response = client.post("/company/invites", json={"email": user.email})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INSTRUCTOR_ALREADY_IN_COMPANY"
    assert db.query(CompanyInstructorInvite).count() == 0


def test_cannot_invite_the_same_person_twice(client, db):
    company = _school(db)
    _act_as_school(company)
    client.post("/company/invites", json={"email": "dup@example.com"})

    response = client.post("/company/invites", json={"email": "dup@example.com"})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INVITE_ALREADY_PENDING"


def test_an_invitation_cannot_smuggle_in_a_loss_making_markup(client, db):
    """Otherwise the offer would bypass the pricing screen's guard."""
    company = _school(db)
    user, _ = _teacher(db, email="known@example.com")
    _act_as_school(company)

    response = client.post(
        "/company/invites",
        json={"email": user.email, "markup_type": "percent", "markup_value": 5},
    )

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "MARKUP_BELOW_BREAK_EVEN"
    assert db.query(CompanyInstructorInvite).count() == 0


# ── Accepting ──────────────────────────────────────────────────────────────


def test_accepting_joins_the_school_and_applies_the_offered_markup(client, db):
    company = _school(db)
    user, instructor = _teacher(db)
    invite = _invite(db, company, user.email)
    _act_as(user)

    response = client.post(f"/instructors/invites/token/{invite.token}/accept")

    assert response.status_code == 200, response.text
    db.refresh(instructor)
    assert instructor.company_id == company.id
    assert instructor.company_markup_type == "percent"
    assert instructor.company_markup_value == 20.0
    assert instructor.company_joined_at is not None
    db.refresh(invite)
    assert invite.status == InviteStatus.ACCEPTED.value


def test_accepting_never_downgrades_a_verified_instructor(client, db):
    """Joining a school must not push them back into a queue they cleared."""
    company = _school(db)
    user, instructor = _teacher(
        db, verification=InstructorVerificationStatus.VERIFIED.value
    )
    invite = _invite(db, company, user.email)
    _act_as(user)

    client.post(f"/instructors/invites/token/{invite.token}/accept")

    db.refresh(instructor)
    assert instructor.verification_status == InstructorVerificationStatus.VERIFIED.value


def test_accepting_satisfies_the_company_approval_step(client, db):
    """An invitation IS the school's approval, so only the admin step remains."""
    company = _school(db)
    user, instructor = _teacher(
        db, verification=InstructorVerificationStatus.PENDING_COMPANY.value
    )
    invite = _invite(db, company, user.email)
    _act_as(user)

    client.post(f"/instructors/invites/token/{invite.token}/accept")

    db.refresh(instructor)
    assert (
        instructor.verification_status
        == InstructorVerificationStatus.PENDING_ADMIN.value
    )


def test_accepting_after_joining_elsewhere_is_refused(client, db):
    """The race the in-transaction re-check exists for."""
    alpha = _school(db)
    beta = _school(db, name="Beta Driving")
    user, instructor = _teacher(db)
    invite = _invite(db, alpha, user.email)

    # They accept a different school's offer first.
    instructor.company_id = beta.id
    db.commit()
    _act_as(user)

    response = client.post(f"/instructors/invites/token/{invite.token}/accept")

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INSTRUCTOR_ALREADY_IN_COMPANY"
    db.refresh(instructor)
    assert instructor.company_id == beta.id  # unchanged


def test_accepting_supersedes_other_open_offers(client, db):
    company = _school(db)
    other = _school(db, name="Other Driving")
    user, _ = _teacher(db)
    mine = _invite(db, company, user.email)
    theirs = _invite(db, other, user.email)
    _act_as(user)

    client.post(f"/instructors/invites/token/{mine.token}/accept")

    db.refresh(theirs)
    assert theirs.status == InviteStatus.EXPIRED.value


def test_an_invitation_addressed_to_someone_else_cannot_be_taken_up(client, db):
    company = _school(db)
    user, _ = _teacher(db, email="me@example.com")
    invite = _invite(db, company, "someone.else@example.com")
    _act_as(user)

    response = client.post(f"/instructors/invites/token/{invite.token}/accept")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INVITE_NOT_FOR_YOU"


def test_an_expired_invitation_cannot_be_accepted(client, db):
    company = _school(db)
    user, _ = _teacher(db)
    invite = _invite(db, company, user.email, expires_in_days=-1)
    _act_as(user)

    response = client.post(f"/instructors/invites/token/{invite.token}/accept")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INVITE_NOT_OPEN"


def test_a_rejected_instructor_cannot_join(client, db):
    company = _school(db)
    user, _ = _teacher(
        db, verification=InstructorVerificationStatus.REJECTED.value
    )
    invite = _invite(db, company, user.email)
    _act_as(user)

    response = client.post(f"/instructors/invites/token/{invite.token}/accept")

    assert response.status_code == 403
    assert response.json()["detail"]["code"] == "INSTRUCTOR_REJECTED"


def test_declining_closes_the_invitation(client, db):
    company = _school(db)
    user, instructor = _teacher(db)
    invite = _invite(db, company, user.email)
    _act_as(user)

    client.post(f"/instructors/invites/token/{invite.token}/decline")

    db.refresh(invite)
    assert invite.status == InviteStatus.DECLINED.value
    db.refresh(instructor)
    assert instructor.company_id is None


def test_the_offer_can_be_previewed_without_signing_in(client, db):
    """The recipient may not have an account yet."""
    company = _school(db)
    invite = _invite(db, company, "newcomer@example.com")

    body = client.get(f"/instructors/invites/token/{invite.token}").json()

    assert body["company_name"] == "Alpha Driving"
    assert body["markup_type"] == "percent"
    assert body["is_open"] is True


def test_an_unknown_token_is_not_found(client, db):
    response = client.get("/instructors/invites/token/nonsense")
    assert response.status_code == 404
    assert response.json()["detail"]["code"] == "INVITE_NOT_FOUND"


# ── The other direction: instructor asks ───────────────────────────────────


def test_an_instructor_can_ask_to_join_and_the_school_approves(client, db):
    company = _school(db)
    user, instructor = _teacher(db)
    _act_as(user)

    created = client.post("/instructors/me/company-requests", json={"company_id": company.id})
    assert created.status_code == 201, created.text
    assert created.json()["direction"] == "request"

    _act_as_school(company)
    invite_id = created.json()["id"]
    approved = client.post(f"/company/invites/{invite_id}/approve")

    assert approved.status_code == 200, approved.text
    db.refresh(instructor)
    assert instructor.company_id == company.id


def test_cannot_request_to_join_while_already_at_a_school(client, db):
    existing = _school(db)
    other = _school(db, name="Other Driving")
    user, _ = _teacher(db, company=existing)
    _act_as(user)

    response = client.post("/instructors/me/company-requests", json={"company_id": other.id})

    assert response.status_code == 409
    assert response.json()["detail"]["code"] == "INSTRUCTOR_ALREADY_IN_COMPANY"


# ── Leaving ────────────────────────────────────────────────────────────────


def test_leaving_clears_the_membership_and_the_markup(client, db):
    company = _school(db)
    user, instructor = _teacher(db, company=company)
    instructor.company_markup_type = "percent"
    instructor.company_markup_value = 20.0
    db.commit()
    _act_as(user)

    response = client.post("/instructors/me/leave-company")

    assert response.status_code == 200, response.text
    db.refresh(instructor)
    # They leave the school but not the platform: an instructor with no company
    # at all would take lessons the platform earned nothing on, so they revert
    # to trading as their own one-person business.
    assert instructor.company_id != company.id
    solo = db.query(Company).filter(Company.id == instructor.company_id).one()
    assert solo.is_solo is True
    assert instructor.company_markup_type is None
    assert instructor.company_markup_value == 0.0


def test_leaving_when_independent_is_refused(client, db):
    user, _ = _teacher(db)
    _act_as(user)

    response = client.post("/instructors/me/leave-company")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INSTRUCTOR_NOT_IN_COMPANY"


def test_a_school_can_remove_one_of_its_own_instructors(client, db):
    company = _school(db)
    _, instructor = _teacher(db, company=company)
    _act_as_school(company)

    response = client.post(f"/company/instructors/{instructor.id}/remove")

    assert response.status_code == 200, response.text
    db.refresh(instructor)
    assert instructor.company_id != company.id
    assert (
        db.query(Company).filter(Company.id == instructor.company_id).one().is_solo
        is True
    )


def test_leaving_your_own_one_person_business_is_refused(client, db):
    """There is nothing to resign from; it would hand the same company back."""
    user, instructor = _teacher(db)
    solo = ensure_solo_company(db, user, instructor)
    db.commit()
    _act_as(user)

    response = client.post("/instructors/me/leave-company")

    assert response.status_code == 400
    assert response.json()["detail"]["code"] == "INSTRUCTOR_NOT_IN_COMPANY"
    db.refresh(instructor)
    assert instructor.company_id == solo.id


def test_a_school_cannot_remove_another_schools_instructor(client, db):
    mine = _school(db)
    theirs = _school(db, name="Rival Driving")
    _, outsider = _teacher(db, company=theirs)
    _act_as_school(mine)

    response = client.post(f"/company/instructors/{outsider.id}/remove")

    assert response.status_code == 404
    db.refresh(outsider)
    assert outsider.company_id == theirs.id


def test_revoking_withdraws_an_invitation(client, db):
    company = _school(db)
    invite = _invite(db, company, "someone@example.com")
    _act_as_school(company)

    response = client.post(f"/company/invites/{invite.id}/revoke")

    assert response.status_code == 200, response.text
    db.refresh(invite)
    assert invite.status == InviteStatus.REVOKED.value


# ── Expiry sweep ───────────────────────────────────────────────────────────


def test_the_sweeper_expires_lapsed_invitations_only(db):
    company = _school(db)
    lapsed = _invite(db, company, "old@example.com", expires_in_days=-1)
    fresh = _invite(db, company, "new@example.com", expires_in_days=3)

    assert expire_stale_invites(db) == 1

    db.refresh(lapsed)
    db.refresh(fresh)
    assert lapsed.status == InviteStatus.EXPIRED.value
    assert fresh.status == InviteStatus.PENDING.value


def test_the_sweeper_is_idempotent(db):
    company = _school(db)
    _invite(db, company, "old@example.com", expires_in_days=-1)

    assert expire_stale_invites(db) == 1
    assert expire_stale_invites(db) == 0
