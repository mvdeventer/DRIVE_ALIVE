"""
Mock payment gateway for local development without provider keys.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

from ...config import settings
from .base import CheckoutSession, PaymentGateway, WebhookEvent

logger = logging.getLogger(__name__)


class MockPaymentGateway(PaymentGateway):
    name = "mock"

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
        fake_id = f"mock_{uuid.uuid4().hex[:8]}"
        # Point at the in-app mock checkout screen. This used to echo
        # success_url straight back, which handed the browser Stripe's
        # unsubstituted "?session_id={CHECKOUT_SESSION_ID}" template whenever a
        # caller took the real-provider branch with this gateway installed.
        url = f"{settings.FRONTEND_URL}/payment/mock?session_id={reference}"
        logger.info(
            "MockPaymentGateway: created checkout (ref=%s amount=%s %s)",
            reference,
            amount_cents,
            currency,
        )
        return CheckoutSession(id=fake_id, url=url, raw={"mock": True})

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> WebhookEvent:
        raise RuntimeError(
            "MockPaymentGateway does not accept webhooks. Configure a real provider."
        )

    def refund(
        self,
        *,
        charge_or_intent_id: str,
        amount_cents: Optional[int] = None,
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        logger.info("MockPaymentGateway: pretend refund for %s", charge_or_intent_id)
        return {"id": f"mock_refund_{uuid.uuid4().hex[:8]}", "status": "succeeded"}
