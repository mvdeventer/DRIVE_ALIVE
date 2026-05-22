"""
Stripe implementation of :class:`PaymentGateway`.
"""

from __future__ import annotations

import logging
from typing import Optional

import stripe

from ...config import settings
from .base import CheckoutSession, PaymentGateway, WebhookEvent

logger = logging.getLogger(__name__)


class StripePaymentGateway(PaymentGateway):
    name = "stripe"

    def __init__(self) -> None:
        if not settings.STRIPE_SECRET_KEY:
            raise RuntimeError("STRIPE_SECRET_KEY is not configured")
        stripe.api_key = settings.STRIPE_SECRET_KEY

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
        session = stripe.checkout.Session.create(
            payment_method_types=["card"],
            line_items=[
                {
                    "price_data": {
                        "currency": currency.lower(),
                        "unit_amount": amount_cents,
                        "product_data": {
                            "name": item_name,
                            "description": item_description,
                        },
                    },
                    "quantity": 1,
                },
            ],
            mode="payment",
            success_url=success_url,
            cancel_url=cancel_url,
            metadata=metadata or {},
            customer_email=customer_email,
            payment_intent_data={
                # PSD2 / SCA: let Stripe Radar decide; don't suppress 3DS.
                "setup_future_usage": None,
            },
            idempotency_key=idempotency_key or f"checkout:{reference}",
        )
        return CheckoutSession(id=session.id, url=session.url, raw=session)

    def verify_webhook(
        self,
        payload: bytes,
        signature: Optional[str],
    ) -> WebhookEvent:
        if not settings.STRIPE_WEBHOOK_SECRET:
            raise RuntimeError("STRIPE_WEBHOOK_SECRET is not configured")
        if not signature:
            raise ValueError("Missing stripe-signature header")

        event = stripe.Webhook.construct_event(
            payload, signature, settings.STRIPE_WEBHOOK_SECRET
        )
        return WebhookEvent(
            type=event["type"],
            provider_event_id=event.get("id"),
            payload=dict(event),
            raw=event,
        )

    def refund(
        self,
        *,
        charge_or_intent_id: str,
        amount_cents: Optional[int] = None,
        reason: Optional[str] = None,
        idempotency_key: Optional[str] = None,
    ) -> dict:
        kwargs: dict = {}
        if charge_or_intent_id.startswith("pi_"):
            kwargs["payment_intent"] = charge_or_intent_id
        else:
            kwargs["charge"] = charge_or_intent_id
        if amount_cents is not None:
            kwargs["amount"] = amount_cents
        if reason:
            kwargs["reason"] = reason

        refund = stripe.Refund.create(
            idempotency_key=idempotency_key
            or f"refund:{charge_or_intent_id}:{amount_cents or 'full'}",
            **kwargs,
        )
        return dict(refund)
