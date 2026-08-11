"""
Admin database backup and restore endpoints
"""

import enum
import json
import os
import secrets
from datetime import date, datetime, time, timedelta
from decimal import Decimal
from typing import Any, Dict, List

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile, status
from fastapi.responses import FileResponse
from sqlalchemy import select, text
from sqlalchemy.sql import sqltypes
from sqlalchemy.orm import Session

from ..database import get_db
from ..middleware.admin import require_admin
from ..utils.auth import get_password_hash
# Imported for their side effect: each one registers its table on
# ``Base.metadata``, which is what BACKUP_TABLES is resolved against. They
# look unused — deleting them makes backup fail with a KeyError on whichever
# table went missing, so they stay.
from ..models.availability import (  # noqa: F401
    CustomAvailability,
    InstructorSchedule,
    TimeOffException,
)
from ..models.booking import Booking, Review  # noqa: F401
from ..models.booking_credit import BookingCredit  # noqa: F401
from ..models.certification import Certification  # noqa: F401
from ..models.company import Company  # noqa: F401
from ..models.company_admin import CompanyAdmin  # noqa: F401
from ..models.company_charge import (  # noqa: F401
    CompanyPlatformCharge,
    CompanySubscriptionCharge,
)
from ..models.company_invite import CompanyInstructorInvite  # noqa: F401
from ..models.password_reset import PasswordResetToken  # noqa: F401
from ..models.payment import Transaction  # noqa: F401
from ..models.payment_session import PaymentSession  # noqa: F401
from ..models.user import Instructor, Student, User  # noqa: F401
from ..models.instructor_verification import (  # noqa: F401
    InstructorVerificationToken,
)
from ..models.verification_token import VerificationToken  # noqa: F401

router = APIRouter(prefix="/admin/database", tags=["admin-database"], dependencies=[Depends(require_admin)])


def list_available_backups():
    """
    List all available backup files in the backups directory
    Returns metadata (filename, size, created date) for each backup
    """
    try:
        backups_dir = "backups"
        if not os.path.exists(backups_dir):
            return {"backups": []}
        
        backups = []
        for filename in sorted(os.listdir(backups_dir), reverse=True):
            if filename.endswith('.json'):
                filepath = os.path.join(backups_dir, filename)
                file_size = os.path.getsize(filepath)
                file_mtime = os.path.getmtime(filepath)
                created_at = datetime.fromtimestamp(file_mtime).isoformat()
                
                backups.append({
                    "filename": filename,
                    "size_bytes": file_size,
                    "size_mb": round(file_size / (1024 * 1024), 2),
                    "created_at": created_at,
                })
        
        return {"backups": backups, "count": len(backups)}
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.get("/backups/download/{filename}")
def download_backup(filename: str):
    """
    Download a specific backup file from the server
    """
    try:
        # Security: Prevent directory traversal
        if ".." in filename or "/" in filename or "\\" in filename:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )
        
        filepath = os.path.join("backups", filename)
        if not os.path.exists(filepath):
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Backup file not found"
            )
        
        return FileResponse(
            path=filepath,
            filename=filename,
            media_type='application/json'
        )
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to download backup: {str(e)}"
        )


# ── What a backup contains ───────────────────────────────────────────────
#
# Backup and restore both derive their columns from the SQLAlchemy models
# rather than from hand-written SQL. Three divergent column lists is how this
# file came to have a backup that could not be restored: every new column had
# to be added in three places, and was not.
#
# Ordered parents-first so foreign keys resolve on insert; restore deletes in
# the reverse order.
BACKUP_TABLES: List[str] = [
    "users",
    "companies",
    "instructors",
    "students",
    "company_admins",
    "company_instructor_invites",
    "bookings",
    "reviews",
    "instructor_schedules",
    "time_off_exceptions",
    "custom_availability",
    "transactions",
    "booking_credits",
    "certifications",
    "company_platform_charges",
    "company_subscription_charges",
]

# Credentials and secrets never leave the database. A backup gets copied to
# operator laptops and cloud storage; a password hash or an API token sitting
# in one is a breach waiting to happen (POPIA s19).
SENSITIVE_COLUMNS: Dict[str, set] = {
    "users": {
        "password_hash",
        "smtp_password",
        "twilio_account_sid",
        "twilio_auth_token",
        "active_session_token",
    },
}

# Deliberately not backed up: short-lived rows that normal operation
# regenerates. Restoring them would resurrect password-reset links and
# checkout sessions that should have died with the data they referred to.
TRANSIENT_TABLES = [
    "password_reset_tokens",
    "verification_tokens",
    "instructor_verification_tokens",
    "payment_sessions",
]

# instructors.company_id and companies.owner_instructor_id point at each
# other, so one of them has to be filled in on a second pass.
_DEFERRED_COLUMNS = {"companies": ("owner_instructor_id",)}


def _ordered(names) -> List[str]:
    """Order tables parents-first, from the model dependency graph.

    Hand-maintained ordering is what this module keeps getting wrong: a purge
    that deletes users before the rows still pointing at them fails on any
    database that enforces foreign keys. SQLAlchemy already knows the order,
    so ask it rather than restating it. (The companies/instructors cycle is
    excluded from the graph by ``use_alter`` on that key, and is closed
    afterwards by _relink_deferred.)
    """
    from ..database import Base

    wanted = set(names)
    return [t.name for t in Base.metadata.sorted_tables if t.name in wanted]


def _insert_order() -> List[str]:
    """Parents before children, for restore."""
    return _ordered(BACKUP_TABLES)


def _purge_order() -> List[str]:
    """Children before parents, for emptying."""
    return list(reversed(_ordered(list(BACKUP_TABLES) + list(TRANSIENT_TABLES))))


def _table(name: str):
    """The live SQLAlchemy Table, which is the authority on what columns exist."""
    from ..database import Base

    return Base.metadata.tables[name]


def _to_jsonable(value: Any) -> Any:
    """Render a column value as JSON, losslessly enough to insert it back."""
    if value is None or isinstance(value, (str, int, float, bool)):
        return value
    if isinstance(value, enum.Enum):
        return value.value
    if isinstance(value, (datetime, date, time)):
        return value.isoformat()
    if isinstance(value, timedelta):
        return value.total_seconds()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, (bytes, bytearray)):
        return value.decode("utf-8", "replace")
    return str(value)


def backup_database_internal(db: Session) -> Dict[str, List[Dict[str, Any]]]:
    """Every table worth keeping, as plain JSON-safe dicts.

    Used by the backup endpoint, the scheduler and the pre-reset snapshot, so
    all three produce the identical format that restore reads.
    """
    backup_data: Dict[str, List[Dict[str, Any]]] = {}

    for table_name in BACKUP_TABLES:
        table = _table(table_name)
        skip = SENSITIVE_COLUMNS.get(table_name, set())
        columns = [c.name for c in table.columns if c.name not in skip]

        rows = db.execute(select(*[table.c[name] for name in columns])).all()
        backup_data[table_name] = [
            {name: _to_jsonable(value) for name, value in zip(columns, row)}
            for row in rows
        ]

    return backup_data


def _from_jsonable(value: Any, column) -> Any:
    """Turn a JSON value back into what the column expects.

    JSON has no date type, so timestamps come back as ISO strings and the
    driver rejects them. Conversion is driven by the column's own type rather
    than by guessing from the string, so a column that genuinely holds text
    that looks like a date is left alone.
    """
    if value is None or not isinstance(value, str):
        if isinstance(column.type, sqltypes.Interval) and isinstance(
            value, (int, float)
        ):
            return timedelta(seconds=value)
        return value

    try:
        if isinstance(column.type, sqltypes.DateTime):
            return datetime.fromisoformat(value)
        if isinstance(column.type, sqltypes.Date):
            return date.fromisoformat(value)
        if isinstance(column.type, sqltypes.Time):
            return time.fromisoformat(value)
        if isinstance(column.type, sqltypes.LargeBinary):
            return value.encode("utf-8")
    except ValueError:
        # Malformed in the file: let the driver reject it with a clearer
        # error than a silently wrong value would ever produce.
        return value
    return value


# Columns that are NOT NULL but deliberately absent from every backup. They
# need a value at insert time; an UPDATE afterwards is too late.
def _placeholder_password() -> str:
    """A real bcrypt hash of something nobody knows.

    Valid in format, so a login attempt fails as a wrong password rather than
    raising on an unparseable hash — but unguessable, so every restored
    account has to go through "forgot password".
    """
    return get_password_hash(secrets.token_urlsafe(64))


def _restore_rows(
    db: Session,
    table_name: str,
    rows: List[Dict[str, Any]],
    placeholder_password: str = "",
) -> int:
    """Insert backed-up rows, tolerating a backup older than the schema.

    Only keys that are still real columns are inserted, so a backup taken
    before a column existed restores fine and that column takes its default.
    """
    if not rows:
        return 0

    table = _table(table_name)
    valid = {c.name for c in table.columns}
    deferred = set(_DEFERRED_COLUMNS.get(table_name, ()))

    columns = table.columns
    payload = []
    for row in rows:
        values = {
            k: _from_jsonable(v, columns[k])
            for k, v in row.items()
            if k in valid and k not in deferred
        }
        if table_name == "users":
            # Hashed once per restore, not once per row: bcrypt is meant to be
            # slow, and a per-row hash turns a large restore into minutes of
            # key stretching. Sharing one unusable hash costs nothing — the
            # plaintext behind it is random and was never kept.
            values["password_hash"] = placeholder_password
        if values:
            payload.append(values)

    if not payload:
        return 0

    # Rows may differ in which columns they carry; executemany needs them
    # uniform, so group by key set rather than silently dropping columns.
    by_shape: Dict[tuple, List[Dict[str, Any]]] = {}
    for values in payload:
        by_shape.setdefault(tuple(sorted(values)), []).append(values)
    for group in by_shape.values():
        db.execute(table.insert(), group)

    return len(payload)


def _relink_deferred(db: Session, backup_data: Dict[str, List[Dict[str, Any]]]) -> None:
    """Fill in the columns held back to break the circular foreign key."""
    for table_name, columns in _DEFERRED_COLUMNS.items():
        table = _table(table_name)
        for row in backup_data.get(table_name, []):
            values = {c: row.get(c) for c in columns if row.get(c) is not None}
            if values and row.get("id") is not None:
                db.execute(
                    table.update().where(table.c.id == row["id"]).values(**values)
                )


def _resync_sequences(db: Session) -> None:
    """Point each PostgreSQL id sequence past the rows just inserted.

    Restore writes explicit primary keys, which leaves the sequence where it
    was. Without this the next signup collides with a restored row and the
    database looks corrupt the moment anyone uses it. SQLite derives the next
    rowid from the table itself, so it needs nothing.
    """
    if db.bind is None or db.bind.dialect.name != "postgresql":
        return

    for table_name in BACKUP_TABLES:
        table = _table(table_name)
        if "id" not in table.c:
            continue
        db.execute(
            text(
                "SELECT setval("
                "pg_get_serial_sequence(:table_name, 'id'), "
                "COALESCE((SELECT MAX(id) FROM {t}), 1), "
                "(SELECT MAX(id) IS NOT NULL FROM {t}))".format(t=table_name)
            ),
            {"table_name": table_name},
        )


def _purge_all(db: Session) -> None:
    """Empty every table a restore is about to repopulate, children first.

    Transient tables go too: stale checkout sessions and password-reset links
    must not outlive the data they point at.
    """
    for table_name in _purge_order():
        db.execute(_table(table_name).delete())


@router.get("/backup")
def backup_database(db: Session = Depends(get_db)):
    """
    Create a JSON backup of the entire database
    Returns a downloadable JSON file with all database records
    """
    try:
        backup_data = backup_database_internal(db)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"roadready_backup_{timestamp}.json"
        filepath = os.path.join("backups", filename)

        os.makedirs("backups", exist_ok=True)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2)

        return FileResponse(
            filepath,
            media_type='application/json',
            filename=filename
        )

    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Backup failed: {str(e)}"
        )


@router.post("/reset")
def reset_database(db: Session = Depends(get_db)):
    """Delete every record, after snapshotting what is about to be destroyed.

    The snapshot goes through ``backup_database_internal``, so it is a file
    ``/restore`` can actually read. It used to be a second, divergent copy of
    the backup logic referring to columns the Booking model no longer had,
    which meant this endpoint raised as soon as one booking existed — exactly
    when the snapshot mattered most.
    """
    try:
        backup_data = backup_database_internal(db)

        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        filename = f"auto_backup_before_reset_{timestamp}.json"
        filepath = os.path.join("backups", filename)
        os.makedirs("backups", exist_ok=True)

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(backup_data, f, indent=2)

        # Only now that the snapshot is safely on disk.
        _purge_all(db)
        db.commit()

        return {
            "message": "Database reset successfully. All data has been deleted.",
            "backup_file": filename,
            "backup_path": filepath,
            "info": "An automatic backup was created before reset.",
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database reset failed: {str(e)}"
        )


@router.get("/backups/config")
def get_backup_config():
    """Get current backup configuration (retention policy, etc.)"""
    try:
        from ..services.backup_scheduler import backup_scheduler
        config = backup_scheduler.load_config()
        return config
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to load backup config: {str(e)}"
        )


@router.put("/backups/config")
def update_backup_config(config: dict):
    """Update backup configuration (retention days, archive settings, etc.)"""
    try:
        from ..services.backup_scheduler import backup_scheduler
        
        # Validate config
        if "retention_days" in config and config["retention_days"] < 1:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Retention days must be at least 1"
            )
        
        backup_scheduler.save_config(config)
        return {"message": "Backup configuration updated", "config": config}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update backup config: {str(e)}"
        )


@router.get("/backups/all")
def list_all_backups():
    """
    List all available backups (regular + archived ZIP files)
    Returns both regular JSON files and zipped archives
    """
    try:
        from ..services.backup_scheduler import backup_scheduler
        return backup_scheduler.list_all_backups()
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to list backups: {str(e)}"
        )


@router.get("/backups/extract/{archive_name}/{backup_filename}")
def extract_from_archive(archive_name: str, backup_filename: str):
    """
    Extract a backup file from a ZIP archive
    Returns the backup file content for restore
    """
    # Same guard as the download endpoint. Path routing already stops a
    # segment containing a slash, so this is belt and braces rather than an
    # open hole — but the two endpoints should not differ on it.
    for candidate in (archive_name, backup_filename):
        if ".." in candidate or "/" in candidate or "\\" in candidate:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid filename"
            )

    try:
        from ..services.backup_scheduler import backup_scheduler
        backup_content = backup_scheduler.extract_from_archive(archive_name, backup_filename)
        
        return {
            "filename": backup_filename,
            "archive": archive_name,
            "data": json.loads(backup_content.decode('utf-8'))
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to extract backup: {str(e)}"
        )


@router.post("/restore")
async def restore_database(file: UploadFile = File(...), db: Session = Depends(get_db)):
    """Replace all data with the contents of a backup file.

    The whole thing — the purge and every insert — is one transaction. It used
    to delete everything and *commit*, then insert; any failure after that
    point (and there always was one, because the INSERTs named columns the
    models no longer had) rolled back only the inserts and left the database
    permanently empty. Now a failed restore leaves the existing data exactly
    as it was.

    Restored accounts cannot log in until they reset their password: backups
    deliberately carry no password hashes.
    """
    try:
        content = await file.read()
        backup_data = json.loads(content)
    except json.JSONDecodeError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid JSON file format"
        )

    if not isinstance(backup_data, dict):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid backup file: expected an object of tables."
        )

    known = set(BACKUP_TABLES)
    if not known.intersection(backup_data):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "That file does not look like a RoadReady backup: it contains "
                "none of the expected tables."
            ),
        )

    try:
        restored: Dict[str, int] = {}
        placeholder_password = _placeholder_password()

        _purge_all(db)

        for table_name in _insert_order():
            rows = backup_data.get(table_name) or []
            if not isinstance(rows, list):
                raise ValueError(f"'{table_name}' should be a list of rows")
            restored[table_name] = _restore_rows(
                db, table_name, rows, placeholder_password
            )

        # Columns held back so the circular company/instructor foreign key
        # had something to point at.
        _relink_deferred(db, backup_data)

        _resync_sequences(db)

        db.commit()

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database restore failed, no data was changed: {str(e)}"
        )

    return {
        "message": "Database restored successfully",
        "restored": restored,
        "users_restored": restored.get("users", 0),
        "instructors_restored": restored.get("instructors", 0),
        "students_restored": restored.get("students", 0),
        "bookings_restored": restored.get("bookings", 0),
        "reviews_restored": restored.get("reviews", 0),
        "password_notice": (
            "Backups contain no passwords. Every restored account must use "
            "'forgot password' before signing in."
        ),
    }
