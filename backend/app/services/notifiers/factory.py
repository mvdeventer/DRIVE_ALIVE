"""
Factory selectors for email + WhatsApp notifiers.

Configuration:
    EMAIL_PROVIDER    = "smtp"   (default; SES / Postmark adapters land in P1-6)
    WHATSAPP_PROVIDER = "twilio" (default; Meta Cloud API adapter is future work)
"""

from __future__ import annotations

import logging
from functools import lru_cache

from ...config import settings
from .base import EmailNotifier, WhatsAppNotifier

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_email_notifier() -> EmailNotifier:
    provider = (getattr(settings, "EMAIL_PROVIDER", "") or "smtp").lower().strip()

    if provider == "smtp":
        # Lazy import to avoid circular dependency at module load.
        from ..email_service import EmailService

        return EmailService()

    raise RuntimeError(f"Unknown EMAIL_PROVIDER: {provider!r}")


@lru_cache(maxsize=1)
def get_whatsapp_notifier() -> WhatsAppNotifier:
    provider = (getattr(settings, "WHATSAPP_PROVIDER", "") or "twilio").lower().strip()

    if provider == "twilio":
        from ..whatsapp_service import whatsapp_service

        return whatsapp_service

    raise RuntimeError(f"Unknown WHATSAPP_PROVIDER: {provider!r}")
