"""Backing the database up, and getting it back.

A backup nobody has restored is a guess, not a backup. These tests restore
one. They exist because this pair had drifted into three hand-written column
lists that disagreed: the backup wrote one shape, restore read another, and
the pre-reset snapshot a third. The result was a restore that could not
succeed and a reset that raised as soon as there was anything to protect.
"""

import io
import json

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine, event, text
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool

import app.routes  # noqa: F401  — registers every model before metadata use
from app.database import Base, get_db
from app.main import app
from app.middleware.admin import require_admin
from app.models.booking import Booking, BookingStatus, PaymentStatus
from app.models.company import Company
from app.models.company_admin import CompanyAdmin
from app.models.company_charge import CompanyPlatformCharge
from app.models.user import Instructor, Student, User, UserRole, UserStatus
from app.routes.database import (
    BACKUP_TABLES,
    SENSITIVE_COLUMNS,
    TRANSIENT_TABLES,
    _insert_order,
    _purge_order,
    backup_database_internal,
)
from app.utils.auth import get_password_hash, verify_password

REAL_PASSWORD = "Str0ng!Passw0rd"


@pytest.fixture
def db():
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    # SQLite ignores foreign keys unless told not to, and production runs on
    # PostgreSQL, which does not. Without this the tests happily accept a
    # purge order that deletes parents before their children — which is a bug
    # this module has shipped twice.
    @event.listens_for(engine, "connect")
    def _enforce_foreign_keys(dbapi_connection, _record):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()

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
    admin = User(
        email="admin@example.com",
        phone="+27600000000",
        password_hash=get_password_hash(REAL_PASSWORD),
        first_name="Plat",
        last_name="Operator",
        role=UserRole.ADMIN,
        status=UserStatus.ACTIVE,
    )
    db.add(admin)
    db.commit()

    app.dependency_overrides[get_db] = lambda: db
    app.dependency_overrides[require_admin] = lambda: admin
    from app.utils.rate_limiter import limiter

    was_enabled = limiter.enabled
    limiter.enabled = False
    try:
        yield TestClient(app, raise_server_exceptions=False)
    finally:
        limiter.enabled = was_enabled
        app.dependency_overrides.pop(get_db, None)
        app.dependency_overrides.pop(require_admin, None)


def _populate(db):
    """A small but representative database, touching the awkward parts."""
    company = Company(name="Alpha Driving", slug="alpha-driving")
    db.add(company)
    db.flush()

    teacher_user = User(
        email="teacher@example.com",
        phone="+27600000001",
        password_hash=get_password_hash(REAL_PASSWORD),
        first_name="Thabo",
        last_name="Nkosi",
        role=UserRole.INSTRUCTOR,
        status=UserStatus.ACTIVE,
        # Secrets that must never reach a backup file.
        smtp_password="smtp-secret",
        twilio_auth_token="twilio-secret",
    )
    learner_user = User(
        email="learner@example.com",
        phone="+27600000002",
        password_hash=get_password_hash(REAL_PASSWORD),
        first_name="Lerato",
        last_name="Mokoena",
        role=UserRole.STUDENT,
        status=UserStatus.ACTIVE,
    )
    db.add_all([teacher_user, learner_user])
    db.flush()

    instructor = Instructor(
        user_id=teacher_user.id,
        id_number="8505125800082",
        license_number="LIC-1",
        license_types="B",
        vehicle_registration="CA12345",
        vehicle_make="Toyota",
        vehicle_model="Corolla",
        vehicle_year=2021,
        hourly_rate=400.0,
        company_id=company.id,
    )
    student = Student(
        user_id=learner_user.id,
        id_number="9505125800083",
        emergency_contact_name="Naledi",
        emergency_contact_phone="+27600000003",
        address_line1="1 Long Street",
        postal_code="8001",
        origin_company_id=company.id,
    )
    db.add_all([instructor, student])
    db.flush()

    # The circular foreign key: the company points back at its owner.
    company.owner_instructor_id = instructor.id

    db.add(CompanyAdmin(user_id=teacher_user.id, company_id=company.id, is_primary=True))

    booking = Booking(
        booking_reference="BK-ROUNDTRIP",
        student_id=student.id,
        instructor_id=instructor.id,
        lesson_date=__import__("datetime").datetime(2026, 9, 1, 10, 0),
        duration_minutes=60,
        lesson_type="standard",
        pickup_latitude=-33.9249,
        pickup_longitude=18.4241,
        pickup_address="1 Long Street",
        amount=432.0,
        instructor_base_amount=400.0,
        company_markup_amount=32.0,
        company_id=company.id,
        booking_source="platform",
        status=BookingStatus.CONFIRMED,
        payment_status=PaymentStatus.PAID,
    )
    db.add(booking)
    db.flush()

    db.add(
        CompanyPlatformCharge(
            company_id=company.id,
            booking_id=booking.id,
            basis_amount=432.0,
            commission_percent=8.0,
            charge_amount=34.56,
            period_key="2026-09",
        )
    )
    db.commit()
    return company, instructor, student, booking


# ── The backup itself ────────────────────────────────────────────────────


def test_a_backup_covers_every_table_it_claims_to(db):
    _populate(db)
    backup = backup_database_internal(db)
    assert set(backup) == set(BACKUP_TABLES)


def test_no_credentials_are_written_to_the_backup_file(db):
    """A backup ends up on laptops and in cloud storage."""
    _populate(db)
    backup = backup_database_internal(db)

    serialised = json.dumps(backup)
    assert "smtp-secret" not in serialised
    assert "twilio-secret" not in serialised
    for column in SENSITIVE_COLUMNS["users"]:
        assert all(column not in row for row in backup["users"])


def test_the_backup_is_json_serialisable(db):
    """Dates and enums have to survive the trip to a file."""
    _populate(db)
    assert json.loads(json.dumps(backup_database_internal(db)))


def test_the_revenue_ledger_is_backed_up(db):
    """It records money owed; losing it in a restore loses the debt."""
    _populate(db)
    backup = backup_database_internal(db)
    assert len(backup["company_platform_charges"]) == 1
    assert backup["company_platform_charges"][0]["charge_amount"] == 34.56


def test_school_administrators_are_backed_up(db):
    """Without these rows a restore locks every school out of its own console."""
    _populate(db)
    assert len(backup_database_internal(db)["company_admins"]) == 1


# ── Round trip ───────────────────────────────────────────────────────────


def _restore(client, backup: dict):
    payload = json.dumps(backup).encode("utf-8")
    return client.post(
        "/admin/database/restore",
        files={"file": ("backup.json", io.BytesIO(payload), "application/json")},
    )


def test_a_backup_can_actually_be_restored(client, db):
    _populate(db)
    backup = backup_database_internal(db)

    response = _restore(client, backup)

    assert response.status_code == 200, response.text


def test_the_restored_database_matches_the_original(client, db):
    _populate(db)
    before = backup_database_internal(db)

    _restore(client, before)

    after = backup_database_internal(db)
    for table in BACKUP_TABLES:
        assert len(after[table]) == len(before[table]), table
    assert after == before


def test_the_circular_company_owner_link_survives(client, db):
    """companies.owner_instructor_id and instructors.company_id point at each other."""
    company, instructor, _s, _b = _populate(db)
    expected = (company.id, instructor.id)
    backup = backup_database_internal(db)

    _restore(client, backup)

    restored = db.query(Company).one()
    assert (restored.id, restored.owner_instructor_id) == expected
    assert db.query(Instructor).one().company_id == expected[0]


def test_the_ledger_survives_the_round_trip(client, db):
    _populate(db)
    backup = backup_database_internal(db)

    _restore(client, backup)

    charge = db.query(CompanyPlatformCharge).one()
    assert charge.charge_amount == 34.56
    assert charge.period_key == "2026-09"


def test_learner_origin_survives_so_commission_stays_correct(client, db):
    company, _i, _s, _b = _populate(db)
    backup = backup_database_internal(db)

    _restore(client, backup)

    assert db.query(Student).one().origin_company_id == company.id


# ── Passwords ────────────────────────────────────────────────────────────


def test_restored_accounts_cannot_be_logged_into(client, db):
    """Backups carry no hashes, so restore must not leave a usable one."""
    _populate(db)
    backup = backup_database_internal(db)

    _restore(client, backup)

    for user in db.query(User).all():
        assert verify_password(REAL_PASSWORD, user.password_hash) is False


def test_the_placeholder_hash_is_still_a_valid_hash(client, db):
    """An unparseable value would make login raise instead of returning 401."""
    _populate(db)

    _restore(client, backup_database_internal(db))

    for user in db.query(User).all():
        # Must not raise.
        assert verify_password("anything at all", user.password_hash) is False


# ── Atomicity: the bug that emptied the database ─────────────────────────


def test_a_failed_restore_changes_nothing(client, db):
    """It used to delete everything and commit *before* inserting."""
    _populate(db)
    before = backup_database_internal(db)

    # A NOT NULL violation rather than a bad foreign key: SQLite does not
    # enforce foreign keys unless asked, and this test is about what survives
    # a mid-restore failure, not about which constraint caused it. Bookings
    # restore late, so users, companies and instructors are already inserted
    # when this blows up.
    corrupt = json.loads(json.dumps(before))
    corrupt["bookings"][0]["amount"] = None

    response = _restore(client, corrupt)

    assert response.status_code == 500
    assert backup_database_internal(db) == before


def test_a_rejected_file_changes_nothing(client, db):
    _populate(db)
    before = backup_database_internal(db)

    response = client.post(
        "/admin/database/restore",
        files={"file": ("nonsense.json", io.BytesIO(b"not json"), "application/json")},
    )

    assert response.status_code == 400
    assert backup_database_internal(db) == before


def test_a_file_that_is_not_a_backup_is_refused(client, db):
    _populate(db)
    before = backup_database_internal(db)

    response = _restore(client, {"shopping_list": [{"item": "milk"}]})

    assert response.status_code == 400
    assert backup_database_internal(db) == before


# ── Backups older than the schema ────────────────────────────────────────


def test_a_backup_predating_a_column_still_restores(client, db):
    """Operators keep old files; a new column must not make them unreadable."""
    _populate(db)
    backup = backup_database_internal(db)
    for row in backup["students"]:
        row.pop("origin_company_id", None)
    for row in backup["companies"]:
        row.pop("is_solo", None)

    response = _restore(client, backup)

    assert response.status_code == 200, response.text
    assert db.query(Student).one().origin_company_id is None


def test_an_unknown_column_is_ignored_rather_than_fatal(client, db):
    """A backup from a newer build, restored onto this one."""
    _populate(db)
    backup = backup_database_internal(db)
    for row in backup["students"]:
        row["some_future_column"] = "whatever"

    assert _restore(client, backup).status_code == 200


# ── Reset ────────────────────────────────────────────────────────────────


def test_reset_works_when_there_are_bookings(client, db):
    """It used to raise here: its snapshot named columns the model had lost."""
    _populate(db)

    response = client.post("/admin/database/reset")

    assert response.status_code == 200, response.text
    assert db.query(User).count() == 0
    assert db.query(Booking).count() == 0


def test_the_snapshot_reset_takes_is_one_restore_can_read(client, db, tmp_path):
    _populate(db)
    expected = backup_database_internal(db)

    response = client.post("/admin/database/reset")
    assert response.status_code == 200, response.text

    with open(response.json()["backup_path"], encoding="utf-8") as f:
        snapshot = json.load(f)

    assert _restore(client, snapshot).status_code == 200
    assert backup_database_internal(db) == expected


def test_the_pre_reset_snapshot_holds_no_credentials(client, db):
    """The old inline copy wrote password hashes to disk."""
    _populate(db)

    response = client.post("/admin/database/reset")

    with open(response.json()["backup_path"], encoding="utf-8") as f:
        raw = f.read()
    assert "smtp-secret" not in raw
    assert "password_hash" not in raw


# ── Ordering, checked against the schema itself ──────────────────────────
#
# These read the dependency graph rather than exercising a database, so they
# hold for PostgreSQL even though the tests above run on SQLite. Ordering is
# what this module has got wrong twice.


def _foreign_keys():
    for name, table in Base.metadata.tables.items():
        for fk in table.foreign_keys:
            yield name, fk.parent.name, fk.column.table.name, fk.ondelete


def test_nothing_is_purged_before_the_rows_pointing_at_it():
    position = {name: i for i, name in enumerate(_purge_order())}
    offenders = [
        f"{parent} purged before {child}.{column}"
        for child, column, parent, ondelete in _foreign_keys()
        if child in position
        and parent in position
        and position[parent] < position[child]
        and not ondelete
    ]
    assert offenders == []


def test_every_managed_table_is_purged():
    """A table left behind would survive a restore and duplicate rows."""
    assert set(_purge_order()) == set(BACKUP_TABLES) | set(TRANSIENT_TABLES)


def test_rows_are_inserted_after_what_they_reference():
    position = {name: i for i, name in enumerate(_insert_order())}
    offenders = [
        f"{child}.{column} inserted before {parent}"
        for child, column, parent, _ondelete in _foreign_keys()
        if child in position
        and parent in position
        and position[parent] > position[child]
        # Held back deliberately and filled in by _relink_deferred.
        and (child, column) != ("companies", "owner_instructor_id")
    ]
    assert offenders == []
