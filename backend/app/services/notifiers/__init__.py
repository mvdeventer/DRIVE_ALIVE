"""
Notifier abstractions (email + WhatsApp).

Use :func:`get_email_notifier` and :func:`get_whatsapp_notifier` to obtain
the configured implementation. Swapping provider (SMTP ↔ SES ↔ Postmark,
Twilio ↔ Meta Cloud API) is an env-var change.
"""

from .base import EmailNotifier, WhatsAppNotifier
from .factory import get_email_notifier, get_whatsapp_notifier

__all__ = [
    "EmailNotifier",
    "WhatsAppNotifier",
    "get_email_notifier",
    "get_whatsapp_notifier",
]
