"""The endpoints that may be reached without signing in.

This is the whole list, and it is the only way to be reachable anonymously:
``authentication_gate`` refuses everything absent from it. That is the point
— the previous arrangement, where each endpoint remembered its own guard,
shipped five that forgot. Among them were the platform's SMTP credentials
(anyone could overwrite them and capture every password-reset link) and
learners' ID numbers and home addresses, readable by counting upwards.

Adding a route here makes it world-readable. Say why in a comment, and
prefer a token or signature check inside the handler over a bare entry.

Paths are the route templates FastAPI matched, e.g. ``/students/{student_id}``
— not the concrete request path — so a parameter value can never be crafted
to look like something else.
"""

from typing import Set, Tuple

Route = Tuple[str, str]  # (method, path template)


# ── Reaching the platform before you have an account ─────────────────────
_ACCOUNT_ENTRY: Set[Route] = {
    ("POST", "/auth/login"),
    ("POST", "/auth/logout"),  # clearing a cookie needs no proof of identity
    ("POST", "/auth/register/student"),
    ("POST", "/auth/register/instructor"),
    ("POST", "/auth/register/company"),
    ("POST", "/auth/forgot-password"),
    ("POST", "/auth/reset-password"),
    # Read by the login screen to configure its idle timer, before any token
    # exists. Returns a single integer of no consequence.
    ("GET", "/auth/inactivity-timeout"),
}

# ── Links people click in an email or WhatsApp message ───────────────────
# The recipient is not signed in and often is not on the device they signed
# up with. Each of these carries a single-use token that the handler checks.
_EMAILED_LINKS: Set[Route] = {
    ("POST", "/verify/account"),
    ("GET", "/verify/instructor"),
    ("POST", "/verify/instructor/admin"),
    ("POST", "/verify/instructor/company"),
    ("GET", "/verify/resend"),
    ("GET", "/verify/status"),
    ("GET", "/unsubscribe"),
    ("POST", "/unsubscribe"),
    # Invitation from a driving school, opened before the invitee has an
    # account. The token in the path is the credential.
    ("GET", "/instructors/invites/token/{token}"),
}

# ── A newly registered instructor setting up before verification ─────────
# Every one of these requires the one-time setup_token issued at
# registration and checked against the row (see routes/instructor_setup.py).
_INSTRUCTOR_SETUP: Set[Route] = {
    ("GET", "/instructors/setup/{instructor_id}/schedule"),
    ("POST", "/instructors/setup/{instructor_id}/schedule"),
    ("PUT", "/instructors/setup/{instructor_id}/schedule/{schedule_id}"),
    ("DELETE", "/instructors/setup/{instructor_id}/schedule/{schedule_id}"),
    ("GET", "/instructors/setup/{instructor_id}/time-off"),
    ("POST", "/instructors/setup/{instructor_id}/time-off"),
    ("DELETE", "/instructors/setup/{instructor_id}/time-off/{time_off_id}"),
}

# ── Browsing the marketplace before signing up ───────────────────────────
# Deliberately public so someone can find an instructor before committing to
# an account. Rates and identity documents are stripped from these responses
# (see routes/instructors.py::PUBLIC_HIDDEN_INSTRUCTOR_FIELDS) — being on
# this list is exactly why that stripping has to be right.
_PUBLIC_MARKETPLACE: Set[Route] = {
    ("GET", "/instructors/"),
    ("GET", "/instructors/{instructor_id}"),
    ("GET", "/availability/instructor/{instructor_id}/slots"),
    ("GET", "/availability/instructor/{instructor_id}/schedule"),
    ("GET", "/availability/instructor/{instructor_id}/time-off"),
    # The registration form offers a list of schools to join.
    ("GET", "/companies"),
    ("GET", "/companies/{company_id}"),
}

# ── Called by machines, authenticated by signature ───────────────────────
_WEBHOOKS: Set[Route] = {
    ("POST", "/payments/webhook"),
    ("POST", "/webhooks/twilio/status"),
}

# ── First run, before there is anybody to authenticate as ────────────────
# Each of these refuses once setup is complete; that check lives in the
# handler because only it knows what "complete" means. /db-setup/reset is
# absent on purpose: it validates an admin JWT itself.
_FIRST_RUN: Set[Route] = {
    ("GET", "/setup/status"),
    ("GET", "/setup/wizard"),
    ("GET", "/setup/admin-contact"),
    ("POST", "/setup/create-initial-admin"),
    ("POST", "/setup/save-services"),
    ("GET", "/db-setup"),
    ("GET", "/db-setup/"),
    ("GET", "/db-setup/status"),
    ("GET", "/db-setup/admin-reset"),
    ("POST", "/db-setup/test"),
    ("POST", "/db-setup/configure"),
}

# ── Liveness ─────────────────────────────────────────────────────────────
_SERVICE: Set[Route] = {
    ("GET", "/"),
    ("GET", "/health"),
}

PUBLIC_ROUTES: Set[Route] = (
    _ACCOUNT_ENTRY
    | _EMAILED_LINKS
    | _INSTRUCTOR_SETUP
    | _PUBLIC_MARKETPLACE
    | _WEBHOOKS
    | _FIRST_RUN
    | _SERVICE
)

# Reachable anonymously *only while the platform has no administrator*, and
# admin-only thereafter. The setup wizard sends test messages to prove the
# operator typed their SMTP and Twilio details correctly, which has to work
# before the first account exists — but /verify/test-email also writes those
# credentials to the admin row, so leaving it open let anyone repoint the
# platform's outgoing mail at a server of their choosing.
FIRST_RUN_ONLY_ROUTES: Set[Route] = {
    ("POST", "/verify/test-email"),
    ("POST", "/verify/test-whatsapp"),
}
