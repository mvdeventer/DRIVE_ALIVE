"""
Database configuration and session management.
Supports lazy initialisation so the server starts even when DATABASE_URL
is not yet configured (first-run wizard fills it in at runtime).

Password encryption
-------------------
When configured via the setup wizard the DB password is stored as
DB_PASSWORD_ENCRYPTED (Fernet) in .env.  DATABASE_URL is stored with
the password masked as *** so it is never written in plain text on disk.
At startup (and after wizard saves) the real URL is rebuilt in memory.
"""
from __future__ import annotations

import logging
import os
from typing import Generator
from urllib.parse import quote_plus

from fastapi import HTTPException, status
from sqlalchemy import create_engine, text
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import Session, sessionmaker

from .config import settings

logger = logging.getLogger(__name__)

_DB_NOT_CONFIGURED = "not_configured"

# ── Mutable engine/session references (replaced by reinitialize_engine) ────────
engine = None
SessionLocal = None

Base = declarative_base()


def _is_configured(url: str | None = None) -> bool:
    url = url or (settings.DATABASE_URL if settings else None)
    return bool(url) and url != _DB_NOT_CONFIGURED and "***" not in url


def _env_or_ini(key: str, default: str) -> str:
    """Return env-var value, then .env file value, then the given default."""
    return os.environ.get(key) or _read_env_key(key) or default


def _decrypt_stored_password() -> str | None:
    """Return the decrypted DB password from DB_PASSWORD_ENCRYPTED env/file."""
    enc = _env_or_ini("DB_PASSWORD_ENCRYPTED", "")
    if not enc:
        return None
    from .utils.encryption import EncryptionService  # lazy import to avoid circular
    return EncryptionService.decrypt(enc)


def _get_effective_url() -> str | None:
    """Return the real SQLAlchemy URL, decrypting stored parts when needed."""
    raw = settings.DATABASE_URL if settings else None
    if not raw or raw == _DB_NOT_CONFIGURED:
        return None
    if "***" not in raw:
        return raw  # plain URL preserved (legacy / dev mode)

    # Encrypted-parts mode: rebuild URL from stored components
    try:
        password = _decrypt_stored_password()
        if not password:
            logger.error("DB_PASSWORD_ENCRYPTED not found – engine unavailable.")
            return None
        host = _env_or_ini("DB_HOST", "localhost")
        port = _env_or_ini("DB_PORT", "5432")
        user = _env_or_ini("DB_USER", "postgres")
        name = _env_or_ini("DB_NAME", "driving_school_db")
        return f"postgresql://{user}:{quote_plus(password)}@{host}:{port}/{name}"
    except Exception as exc:
        logger.error("Engine config decryption error (%s); engine unavailable.", type(exc).__name__)
        return None


def _read_env_key(key: str) -> str | None:
    """Read a single key from backend/.env without loading all settings."""
    from pathlib import Path
    env_path = Path(__file__).resolve().parent.parent / ".env"
    if not env_path.exists():
        return None
    for line in env_path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if line.startswith(f"{key}="):
            return line[len(key) + 1:].strip()
    return None


def _build_engine(url: str):
    return create_engine(
        url,
        pool_pre_ping=True,
        echo=getattr(settings, "DEBUG", False),
    )


def reinitialize_engine(new_url: str | None = None) -> bool:
    """
    (Re)initialise the SQLAlchemy engine.
    Called once at startup and again after the setup wizard saves credentials.
    Returns True on success, False on failure.
    """
    global engine, SessionLocal

    url = new_url or _get_effective_url()
    if not url or not _is_configured(url):
        logger.warning("DATABASE_URL not configured – database unavailable.")
        engine = None
        SessionLocal = None
        return False

    try:
        if engine is not None:
            engine.dispose()

        engine = _build_engine(url)
        # Quick connection test
        with engine.connect() as conn:
            conn.execute(text("SELECT 1"))

        SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
        logger.info("Database engine initialised: %s", url.split("@")[-1])
        return True
    except Exception as exc:
        logger.error("Database connection failed: %s", exc)
        engine = None
        SessionLocal = None
        return False


# ── Attempt initial connection at import time ──────────────────────────────────
reinitialize_engine()


def get_db() -> Generator[Session, None, None]:
    """FastAPI dependency – yields a DB session or raises 503."""
    if SessionLocal is None:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Database not configured. Please complete setup at /db-setup",
        )
    db: Session = SessionLocal()
    try:
        yield db
    finally:
        db.close()
