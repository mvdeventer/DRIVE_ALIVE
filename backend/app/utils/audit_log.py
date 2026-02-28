"""
Lightweight audit logger.
Writes structured lines to  backend/logs/audit.log  with daily rotation.
Call  write_audit()  from any route that changes security-sensitive config.
"""
from __future__ import annotations

import logging
import logging.handlers
from datetime import datetime, timezone
from pathlib import Path

_LOG_DIR = Path(__file__).resolve().parents[3] / "logs"
_LOG_DIR.mkdir(parents=True, exist_ok=True)

_audit_logger = logging.getLogger("drive_alive.audit")
_audit_logger.setLevel(logging.INFO)
_audit_logger.propagate = False  # keep audit events out of the main log

if not _audit_logger.handlers:
    _handler = logging.handlers.TimedRotatingFileHandler(
        filename=str(_LOG_DIR / "audit.log"),
        when="midnight",
        backupCount=30,
        encoding="utf-8",
    )
    _handler.setFormatter(
        logging.Formatter("%(asctime)s  %(message)s", datefmt="%Y-%m-%dT%H:%M:%SZ")
    )
    _audit_logger.addHandler(_handler)


def write_audit(event: str, actor: str = "unknown", ip: str = "unknown", detail: str = "") -> None:
    """
    Record a security-relevant event.

    Parameters
    ----------
    event:  Short upper-case identifier.  E.g. "DB_CREDENTIALS_SAVED"
    actor:  Who performed the action (admin username, "setup_wizard", …)
    ip:     Remote IP address of the HTTP request
    detail: Any extra context (never log raw passwords here)
    """
    ts = datetime.now(timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    parts = [f"event={event}", f"actor={actor!r}", f"ip={ip}"]
    if detail:
        parts.append(f"detail={detail!r}")
    _audit_logger.info("  ".join(parts))
