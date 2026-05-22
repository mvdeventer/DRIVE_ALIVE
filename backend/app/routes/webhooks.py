"""
Inbound webhooks from third-party providers.

Currently:
    - Twilio message-status callbacks (delivery receipts for WhatsApp / SMS).

Stripe webhooks live in :mod:`app.routes.payments` because they create
bookings; keeping them together avoids circular imports.
"""

from __future__ import annotations

import logging

from fastapi import APIRouter, HTTPException, Request, status
from twilio.request_validator import RequestValidator

from ..config import settings
from ..services.whatsapp_service import whatsapp_service

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/webhooks", tags=["Webhooks"])


def _resolve_auth_token() -> str:
    """Prefer the Twilio token stored on the WhatsApp service singleton (which
    falls back through DB → .env). Empty string disables validation entirely
    (development convenience — production MUST configure a token)."""
    return getattr(whatsapp_service, "auth_token", "") or settings.TWILIO_AUTH_TOKEN


@router.post("/twilio/status")
async def twilio_status_callback(request: Request) -> dict:
    """Receive Twilio Message Status Callbacks.

    Twilio POSTs application/x-www-form-urlencoded with at minimum:
        MessageSid, MessageStatus, To, From, ErrorCode (when failed).

    Request signature is verified per Twilio's HMAC-SHA1 spec.
    https://www.twilio.com/docs/usage/security#validating-requests
    """
    auth_token = _resolve_auth_token()
    signature = request.headers.get("X-Twilio-Signature", "")
    form = await request.form()
    params = {k: str(v) for k, v in form.items()}

    if auth_token:
        validator = RequestValidator(auth_token)
        # Twilio signs the FULL public URL. Behind a reverse proxy the host
        # comes from the X-Forwarded-* headers; FastAPI's request.url already
        # respects them when the ProxyHeadersMiddleware is active.
        url = str(request.url)
        if not validator.validate(url, params, signature):
            # Re-try with query string stripped — some Twilio clients omit it
            # during signature calculation.
            base_url = url.split("?", 1)[0]
            if not validator.validate(base_url, params, signature):
                logger.warning(
                    "Twilio status callback signature invalid (sid=%s)",
                    params.get("MessageSid"),
                )
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Invalid Twilio signature",
                )
    else:
        if settings.ENVIRONMENT == "production":
            logger.error(
                "Twilio auth token not configured — refusing status callback in production"
            )
            raise HTTPException(
                status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
                detail="Twilio webhook validation not configured",
            )
        logger.warning("Twilio auth token missing — accepting callback UNVERIFIED (dev only)")

    sid = params.get("MessageSid")
    msg_status = params.get("MessageStatus")
    err_code = params.get("ErrorCode")
    err_msg = params.get("ErrorMessage")

    if msg_status in {"failed", "undelivered"}:
        logger.error(
            "Twilio message failure: sid=%s status=%s error=%s (%s)",
            sid,
            msg_status,
            err_code,
            err_msg,
        )
    else:
        logger.info("Twilio message status: sid=%s status=%s", sid, msg_status)

    return {"status": "received"}
