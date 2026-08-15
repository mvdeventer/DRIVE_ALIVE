"""
Factory for selecting a payment gateway based on configuration.

Configuration:
    PAYMENT_PROVIDER = "stripe" | "mock" | "payfast" (future)

If unset, resolves to "stripe" when STRIPE_SECRET_KEY is present, and to
"mock" only when ALLOW_MOCK_PAYMENTS is explicitly true. With neither set
there is no usable provider, so the factory raises instead of handing back
a gateway that cannot actually take a payment.

`name == "mock"` is the single source of truth for mock mode — routes must
ask the gateway rather than re-deriving it from settings, or the two drift
apart and checkout hands the browser an unusable URL.
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
        if settings.STRIPE_SECRET_KEY:
            provider = "stripe"
        elif settings.ALLOW_MOCK_PAYMENTS:
            provider = "mock"
        else:
            raise RuntimeError(
                "No payment provider is configured. Set STRIPE_SECRET_KEY, or set "
                "ALLOW_MOCK_PAYMENTS=true in backend/.env for local development."
            )

    if provider == "stripe":
        from .stripe_gateway import StripePaymentGateway

        return StripePaymentGateway()

    if provider == "mock":
        # ALLOW_MOCK_PAYMENTS stays authoritative even when the provider is
        # named explicitly, so PAYMENT_PROVIDER=mock can never quietly disable
        # real charging in an environment that never opted in.
        if not settings.ALLOW_MOCK_PAYMENTS:
            raise RuntimeError(
                "PAYMENT_PROVIDER=mock requires ALLOW_MOCK_PAYMENTS=true."
            )

        from .mock_gateway import MockPaymentGateway

        return MockPaymentGateway()

    # Placeholder so unknown values fail loudly instead of silently mocking.
    raise RuntimeError(f"Unknown PAYMENT_PROVIDER: {provider!r}")
