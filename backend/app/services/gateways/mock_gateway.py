"""
Mock payment gateway for local development without provider keys.
"""

from __future__ import annotations

import logging
import uuid
from typing import Optional

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
        # The caller (route) is responsible for building the local mock URL,
        # but we still return a usable id for storage.
        logger.info(
            "MockPaymentGateway: created checkout (ref=%s amount=%s %s)",
            reference,
            amount_cents,
            currency,
        )
        return CheckoutSession(id=fake_id, url=success_url, raw={"mock": True})

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
