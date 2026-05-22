"""
Factory for selecting a payment gateway based on configuration.

Configuration:
    PAYMENT_PROVIDER = "stripe" | "mock" | "payfast" (future)

If unset, falls back to "stripe" when STRIPE_SECRET_KEY is present,
otherwise "mock".
"""

from __future__ import annotations

import logging
from functools import lru_cache

from ...config import settings
from .base import PaymentGateway

logger = logging.getLogger(__name__)


@lru_cache(maxsize=1)
def get_payment_gateway() -> PaymentGateway:
    provider = (getattr(settings, "PAYMENT_PROVIDER", "") or "").lower().strip()

    if not provider:
        provider = "stripe" if settings.STRIPE_SECRET_KEY else "mock"

    if provider == "stripe":
        from .stripe_gateway import StripePaymentGateway

        return StripePaymentGateway()

    if provider == "mock":
        from .mock_gateway import MockPaymentGateway

        return MockPaymentGateway()

    # Placeholder so unknown values fail loudly instead of silently mocking.
    raise RuntimeError(f"Unknown PAYMENT_PROVIDER: {provider!r}")
