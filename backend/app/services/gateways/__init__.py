"""
Payment gateway abstractions.

Use :func:`get_payment_gateway` to obtain the configured gateway. Swapping
provider (Stripe ↔ PayFast ↔ mock) is an env-var change, not a refactor.
"""

from .base import CheckoutSession, PaymentGateway, WebhookEvent
from .factory import get_payment_gateway

__all__ = [
    "CheckoutSession",
    "PaymentGateway",
    "WebhookEvent",
    "get_payment_gateway",
]
