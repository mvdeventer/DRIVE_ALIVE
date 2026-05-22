"""
Notifier interfaces. Concrete adapters live alongside the existing services
(`email_service.py`, `whatsapp_service.py`).
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from typing import Optional


class EmailNotifier(ABC):
    """Provider-agnostic email sender."""

    name: str = "unknown"

    @abstractmethod
    def send_email(
        self,
        *,
        to: str,
        subject: str,
        html: str,
        text: Optional[str] = None,
        from_addr: Optional[str] = None,
        headers: Optional[dict] = None,
    ) -> bool:
        """Send a single email. Returns True on success."""


class WhatsAppNotifier(ABC):
    """Provider-agnostic WhatsApp sender."""

    name: str = "unknown"

    @abstractmethod
    def send_text(self, *, to_phone: str, message: str) -> bool:
        """Send a freeform text message. May be rejected by provider outside
        the 24-hour customer-service window — use :meth:`send_template` for
        proactive notifications."""

    @abstractmethod
    def send_template(
        self,
        *,
        to_phone: str,
        template_id: str,
        variables: Optional[dict] = None,
    ) -> bool:
        """Send a pre-approved template message (required for Business-Initiated
        conversations under Meta WhatsApp Business Policy)."""
