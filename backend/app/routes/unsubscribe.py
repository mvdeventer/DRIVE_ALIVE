"""
One-click unsubscribe endpoint.

Compliant with:
    - RFC 8058 (one-click List-Unsubscribe-Post)
    - Gmail / Yahoo bulk-sender requirements (2024)
    - CAN-SPAM, POPIA §69, GDPR Art.7(3) "withdrawal as easy as consent"

Token format: HMAC-SHA256(SECRET_KEY, email.lower()) truncated to 32 hex chars.
Must match what :meth:`EmailService._unsubscribe_token` generates.
"""

from __future__ import annotations

import hashlib
import hmac
import logging
from typing import Optional

from fastapi import APIRouter, Depends, Form, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy.orm import Session

from ..config import settings
from ..database import get_db
from ..models.user import User

logger = logging.getLogger(__name__)

router = APIRouter(tags=["Unsubscribe"])


def _expected_token(email: str) -> str:
    secret = (getattr(settings, "SECRET_KEY", "") or "").encode()
    return hmac.new(secret, email.lower().strip().encode(), hashlib.sha256).hexdigest()[:32]


def _verify(email: str, token: str) -> bool:
    return hmac.compare_digest(_expected_token(email), token or "")


def _clear_opt_ins(db: Session, email: str) -> bool:
    user = db.query(User).filter(User.email == email.lower().strip()).first()
    if not user:
        # Don't reveal whether the address exists.
        return False
    user.email_marketing_opt_in_at = None
    user.sms_opt_in_at = None
    user.whatsapp_opt_in_at = None
    db.commit()
    logger.info("User %s unsubscribed from all marketing channels", email)
    return True


@router.get("/unsubscribe", response_class=HTMLResponse)
def unsubscribe_page(
    email: str = Query(...),
    token: str = Query(...),
) -> HTMLResponse:
    """Render a minimal confirmation page (browser GET)."""
    if not _verify(email, token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid link")
    html = f"""<!doctype html>
<html><head><meta charset="utf-8"><title>Unsubscribe</title>
<style>body{{font-family:system-ui,sans-serif;max-width:480px;margin:40px auto;padding:20px;color:#222}}
button{{background:#007AFF;color:#fff;border:0;padding:12px 24px;border-radius:6px;font-size:16px;cursor:pointer}}</style>
</head><body>
<h2>Unsubscribe</h2>
<p>Click the button below to unsubscribe <strong>{email}</strong> from all marketing emails, SMS, and WhatsApp notifications from RoadReady.</p>
<p>Transactional messages (booking confirmations, password resets) will continue.</p>
<form method="post" action="/unsubscribe">
  <input type="hidden" name="email" value="{email}">
  <input type="hidden" name="token" value="{token}">
  <button type="submit">Unsubscribe me</button>
</form>
</body></html>"""
    return HTMLResponse(content=html)


@router.post("/unsubscribe")
def unsubscribe_post(
    email: str = Form(...),
    token: str = Form(...),
    # RFC 8058 one-click handlers send `List-Unsubscribe=One-Click` as form body;
    # we accept (but don't require) it.
    List_Unsubscribe: Optional[str] = Form(None, alias="List-Unsubscribe"),
    db: Session = Depends(get_db),
) -> dict:
    """One-click POST handler (RFC 8058)."""
    if not _verify(email, token):
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Invalid link")
    _clear_opt_ins(db, email)
    # Always return 200 — never leak account existence.
    return {"status": "unsubscribed"}
