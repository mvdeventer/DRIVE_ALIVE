"""
Centralised logging configuration with PII redaction.

POPIA §19 / GDPR Art.32 require pseudonymisation of personal data in logs.
This module installs a logging filter that masks emails, phone numbers,
SA ID numbers, JWT tokens and password-reset tokens before any record
reaches a handler — including 3rd-party libs (uvicorn, sqlalchemy, stripe).

Output format switches to JSON when ``LOG_JSON=true`` (recommended in prod
for ingestion by Datadog / Loki / CloudWatch).
"""

from __future__ import annotations

import json
import logging
import os
import re
from datetime import datetime, timezone


# ── Redaction patterns ─────────────────────────────────────────────────────────
# Compiled once; applied to msg AND args before formatting.

_EMAIL_RE = re.compile(r"[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}")
_PHONE_RE = re.compile(r"\+?\d[\d\s().-]{8,15}\d")
_SA_ID_RE = re.compile(r"\b\d{13}\b")
# JWTs: three base64 segments separated by dots; conservative length to avoid FP.
_JWT_RE = re.compile(r"\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b")
# Stripe-style keys (sk_live_, pk_live_, whsec_, rk_).
_STRIPE_KEY_RE = re.compile(r"\b(?:sk|pk|rk|whsec)_(?:live|test)_[A-Za-z0-9]{16,}\b")
# Generic bearer/reset token query params.
_TOKEN_QS_RE = re.compile(r"(token|password|secret|api[_-]?key|authorization)=([^\s&\"']+)", re.IGNORECASE)


def _mask_email(m: re.Match) -> str:
    s = m.group(0)
    local, _, domain = s.partition("@")
    if len(local) <= 2:
        return f"***@{domain}"
    return f"{local[0]}***{local[-1]}@{domain}"


def _mask_phone(m: re.Match) -> str:
    digits = re.sub(r"\D", "", m.group(0))
    if len(digits) < 4:
        return "***"
    return f"***{digits[-4:]}"


def _redact(value: str) -> str:
    if not isinstance(value, str) or not value:
        return value
    value = _STRIPE_KEY_RE.sub("[REDACTED_KEY]", value)
    value = _JWT_RE.sub("[REDACTED_JWT]", value)
    value = _TOKEN_QS_RE.sub(lambda m: f"{m.group(1)}=[REDACTED]", value)
    value = _SA_ID_RE.sub("[REDACTED_ID]", value)
    value = _EMAIL_RE.sub(_mask_email, value)
    value = _PHONE_RE.sub(_mask_phone, value)
    return value


class PIIRedactionFilter(logging.Filter):
    """Mutates LogRecord in-place so every handler (and the JSON formatter) sees
    only the redacted text."""

    def filter(self, record: logging.LogRecord) -> bool:  # noqa: A003
        try:
            if isinstance(record.msg, str):
                record.msg = _redact(record.msg)
            if record.args:
                if isinstance(record.args, dict):
                    record.args = {
                        k: (_redact(v) if isinstance(v, str) else v)
                        for k, v in record.args.items()
                    }
                else:
                    record.args = tuple(
                        _redact(a) if isinstance(a, str) else a
                        for a in record.args
                    )
        except Exception:
            # Never let logging break the request.
            pass
        return True


class JSONFormatter(logging.Formatter):
    """Single-line JSON per record."""

    def format(self, record: logging.LogRecord) -> str:
        payload = {
            "ts": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "level": record.levelname,
            "logger": record.name,
            "msg": record.getMessage(),
        }
        if record.exc_info:
            payload["exc"] = self.formatException(record.exc_info)
        # Common contextual extras
        for key in ("request_id", "user_id", "path", "method", "status_code"):
            val = getattr(record, key, None)
            if val is not None:
                payload[key] = val
        return json.dumps(payload, ensure_ascii=False, default=str)


def setup_logging(level: str | None = None) -> None:
    """Idempotent root-logger setup. Safe to call multiple times."""
    level = (level or os.getenv("LOG_LEVEL", "INFO")).upper()
    use_json = os.getenv("LOG_JSON", "").lower() in {"1", "true", "yes"}

    root = logging.getLogger()
    # Clean existing handlers so re-init doesn't duplicate.
    for h in list(root.handlers):
        root.removeHandler(h)

    handler = logging.StreamHandler()
    handler.addFilter(PIIRedactionFilter())
    if use_json:
        handler.setFormatter(JSONFormatter())
    else:
        handler.setFormatter(
            logging.Formatter(
                "%(asctime)s [%(levelname)s] %(name)s: %(message)s",
                datefmt="%Y-%m-%d %H:%M:%S",
            )
        )

    root.addHandler(handler)
    root.setLevel(level)

    # Tighten noisy libs.
    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
    logging.getLogger("urllib3").setLevel(logging.WARNING)
