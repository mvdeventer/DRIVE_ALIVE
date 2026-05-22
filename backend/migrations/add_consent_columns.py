"""
Migration: Add POPIA / GDPR consent columns to users table.

Adds:
  - email_marketing_opt_in_at  (DATETIME, nullable)
  - sms_opt_in_at              (DATETIME, nullable)
  - whatsapp_opt_in_at         (DATETIME, nullable)
  - consent_ip                 (VARCHAR, nullable)
  - terms_accepted_at          (DATETIME, nullable)
  - privacy_policy_version     (VARCHAR, nullable)

Idempotent: safe to run multiple times.

Usage:
    cd backend
    .\\venv\\Scripts\\python.exe migrations/add_consent_columns.py
"""

import sys
from pathlib import Path

backend_dir = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import inspect, text  # noqa: E402

from app.database import engine  # noqa: E402


COLUMNS = [
    ("email_marketing_opt_in_at", "TIMESTAMP"),
    ("sms_opt_in_at", "TIMESTAMP"),
    ("whatsapp_opt_in_at", "TIMESTAMP"),
    ("consent_ip", "VARCHAR"),
    ("terms_accepted_at", "TIMESTAMP"),
    ("privacy_policy_version", "VARCHAR"),
]


def migrate() -> None:
    inspector = inspect(engine)
    existing = {col["name"] for col in inspector.get_columns("users")}

    to_add = [(name, sqltype) for name, sqltype in COLUMNS if name not in existing]
    if not to_add:
        print("All consent columns already present — nothing to do.")
        return

    # PostgreSQL prefers TIMESTAMP WITH TIME ZONE; SQLite accepts either.
    is_postgres = engine.dialect.name.startswith("postgres")

    with engine.connect() as conn:
        for name, sqltype in to_add:
            col_type = sqltype
            if is_postgres and sqltype == "TIMESTAMP":
                col_type = "TIMESTAMP WITH TIME ZONE"
            print(f"Adding column users.{name} ({col_type}) ...")
            conn.execute(text(f"ALTER TABLE users ADD COLUMN {name} {col_type}"))
        conn.commit()

    print(f"Added {len(to_add)} consent column(s).")


if __name__ == "__main__":
    migrate()
