"""The platform-admin authorization boundary.

``require_admin`` gates every ``/admin/*`` route — 57 call sites including
Reset Database, Backup and Restore. It authorizes by exact equality against
``UserRole.ADMIN``, which is what makes it safe to add further roles: a new
role value is rejected by construction rather than needing all 57 sites
re-audited.

These tests pin that property, so the company-scoped admin role added later
cannot silently inherit platform-admin powers.
"""

import asyncio
from types import SimpleNamespace

import pytest
from fastapi import HTTPException

# app/routes/__init__.py eagerly imports sibling route modules, one of which
# imports app.middleware.admin — so importing the middleware cold re-enters it
# while it is still half-initialised. Let the routes package settle first.
import app.routes  # noqa: F401  (import order matters, see above)
from app.middleware.admin import require_admin
from app.models.user import UserRole, UserStatus


def _call(role, status=UserStatus.ACTIVE):
    """Invoke the dependency directly with a stand-in principal."""
    user = SimpleNamespace(id=1, role=role, status=status)
    return asyncio.run(require_admin(current_user=user, db=None))


def test_active_admin_is_allowed():
    user = _call(UserRole.ADMIN)
    assert user.role == UserRole.ADMIN


@pytest.mark.parametrize("role", [UserRole.INSTRUCTOR, UserRole.STUDENT])
def test_known_non_admin_roles_are_rejected(role):
    with pytest.raises(HTTPException) as exc:
        _call(role)
    assert exc.value.status_code == 403
    assert exc.value.detail == "Administrator privileges required"


def test_unknown_future_role_is_rejected_by_construction():
    """Any role value that is not exactly UserRole.ADMIN must be refused.

    This is the property that lets us introduce company-scoped admins without
    re-auditing every /admin/* route. If someone ever loosens require_admin to
    a membership test or a truthiness check, this fails.
    """
    with pytest.raises(HTTPException) as exc:
        _call("company_admin")
    assert exc.value.status_code == 403
    assert exc.value.detail == "Administrator privileges required"


def test_str_enum_equality_accepts_the_literal_admin_string():
    """UserRole subclasses str, so the literal "admin" compares equal.

    Documented deliberately: it means the check is on the role *value*, not on
    object identity, so a detached/serialised role still authorizes correctly.
    It is safe precisely because no other value compares equal — see
    test_unknown_future_role_is_rejected_by_construction.
    """
    assert _call("admin") is not None


@pytest.mark.parametrize(
    "account_status", [UserStatus.INACTIVE, UserStatus.SUSPENDED]
)
def test_admin_must_also_be_active(account_status):
    with pytest.raises(HTTPException) as exc:
        _call(UserRole.ADMIN, status=account_status)
    assert exc.value.status_code == 403
    assert exc.value.detail == "Admin account is not active"
