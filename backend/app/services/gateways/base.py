"""
Payment gateway interface.

All providers (Stripe, PayFast, mock) must implement :class:`PaymentGateway`.
Higher-level booking / refund / dispute logic should depend on this interface,
not on a specific SDK.
"""

from __future__ import annotations

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any, Optional


@dataclass
class CheckoutSession:
    """Provider-agnostic checkout session result."""

    id: str  # Provider's session identifier (used to look up status later).
    url: str  # Hosted checkout URL to redirect the user to.
    raw: Any = None  # Original provider response (for logging / debugging).


@dataclass
class WebhookEvent:
    """Provider-agnostic webhook event."""

    type: str  # Canonical event type, e.g. "checkout.completed", "charge.refunded".
    provider_event_id: Optional[str] = None
    payload: dict = field(default_factory=dict)
    raw: Any = None


class PaymentGateway(ABC):
    """Abstract payment gateway. One concrete subclass per provider."""

    name: str = "unknown"

    @abstractmethod
    def create_checkout_session(
        self,
        *,
        amount_cents: int,
        currency: str,
        reference: str,
        success_url: str,
        cancel_url: str,
        item_name: str,
        item_description: str,
        customer_email: Optional[str] = None,
        metadata: Optional[dict] = None,
        idempotency_key: Optional[str] = None,
    ) -> CheckoutSession:
        """Create a hosted checkout session and return the redirect URL."""

    @abstractmethod
    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> WebhookEvent:
        """Verify webhook signature and return parsed event.

        Must raise an exception (ValueError or provider-specific) when the
        signature is missing or invalid.
        """

    @abstractmethod
    def refund(
        self,
        *,
        charge_or_intent_id: str,
        amount_cents: Optional[int] = None,
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        """Issue a refund. Returns provider response as dict."""
