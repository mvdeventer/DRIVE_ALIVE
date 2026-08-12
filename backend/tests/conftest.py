"""Shared test setup.

The important part is the SQLite pragma below. Production runs on
PostgreSQL, which enforces foreign keys; SQLite ignores them unless asked.
That gap has already let two bugs through — a backup purge order that
deleted parents before their children, which would have failed on the
deployment database while every test passed.

Registering the listener on the Engine *class* rather than on one engine
means it applies to every engine any test file creates, including the
eighteen that build their own, without each having to remember.
"""

import sqlite3

import pytest
from sqlalchemy import create_engine, event, text
from sqlalchemy.engine import Engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool


@event.listens_for(Engine, "connect")
def _enforce_sqlite_foreign_keys(dbapi_connection, _connection_record):
    """Make SQLite behave like the database this code is deployed against."""
    if isinstance(dbapi_connection, sqlite3.Connection):
        cursor = dbapi_connection.cursor()
        cursor.execute("PRAGMA foreign_keys=ON")
        cursor.close()


def build_test_engine():
    """An empty in-memory database with the full schema.

    Shared here so new test files do not each reinvent it — including the
    partial unique index, which ``create_all`` does not know about because
    it is applied by the incremental migrations at boot.
    """
    # StaticPool keeps every connection pointed at the same in-memory
    # database, and check_same_thread lets TestClient use it from its own
    # thread.
    engine = create_engine(
        "sqlite://",
        connect_args={"check_same_thread": False},
        poolclass=StaticPool,
    )

    import app.routes  # noqa: F401  — registers every model on the metadata
    from app.database import Base

    Base.metadata.create_all(bind=engine)
    with engine.connect() as conn:
        conn.execute(
            text(
                "CREATE UNIQUE INDEX ix_companies_single_platform_host "
                "ON companies (is_platform_host) WHERE is_platform_host = 1"
            )
        )
        conn.commit()
    return engine


@pytest.fixture
def db_engine():
    """A fresh, empty database for one test."""
    return build_test_engine()


@pytest.fixture
def db_session():
    """A session against a fresh, empty database."""
    engine = build_test_engine()
    session = sessionmaker(bind=engine)()
    try:
        yield session
    finally:
        session.close()


def pytest_configure(config):
    config.addinivalue_line(
        "markers",
        "enforce_authentication_gate: run this test against the real "
        "authentication gate instead of the default bypass",
    )


@pytest.fixture(autouse=True)
def bypass_authentication_gate(request):
    """Let endpoint tests reach their handler without signing in first.

    ``authentication_gate`` is registered on the application, so it applies
    to every request a TestClient makes. Almost every test here is about
    what an endpoint *does*, and already overrides whichever authorisation
    dependency it needs; making each of them mint a JWT as well would be a
    lot of noise for no coverage.

    The cost is that an endpoint test passing does NOT show the endpoint is
    protected — the gate was switched off for it. What shows that is
    tests/test_authentication_gate.py, which is marked
    ``enforce_authentication_gate`` and so runs against the real thing.
    """
    if request.node.get_closest_marker("enforce_authentication_gate"):
        yield
        return

    from app.main import app
    from app.middleware.authentication_gate import authentication_gate

    app.dependency_overrides[authentication_gate] = lambda: None
    try:
        yield
    finally:
        app.dependency_overrides.pop(authentication_gate, None)
