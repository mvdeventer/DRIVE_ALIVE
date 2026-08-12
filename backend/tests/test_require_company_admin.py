"""The company-scoped authorization boundary.

``require_company_admin`` resolves which single company the caller may act on.
Routes must take the company id from the returned context, never from a
caller-supplied parameter — these tests pin that the context is derived purely
from the caller's own profile row.
"""

import asyncio
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

# See tests/test_require_admin_boundary.py — app/routes/__init__.py must settle
# before a middleware module can be imported directly.
import app.routes  # noqa: F401
from app.middleware.company import require_company_admin
from app.models.user import UserStatus


def _db(profile=None, company=None):
    """Stub Session whose two .query(...).filter(...).first() calls return in order."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.side_effect = [profile, company]
    return db


def _user(status=UserStatus.ACTIVE):
    return SimpleNamespace(id=7, status=status, role="company_admin")


def _profile(company_id=3, is_primary=True):
    return SimpleNamespace(id=1, user_id=7, company_id=company_id, is_primary=is_primary)


def _company(company_id=3, is_active=True):
    return SimpleNamespace(id=company_id, is_active=is_active, name="ABC Driving")


def _call(user, db):
    return asyncio.run(require_company_admin(current_user=user, db=db))


def test_returns_context_scoped_to_the_callers_own_company():
    ctx = _call(_user(), _db(_profile(company_id=3), _company(company_id=3)))
    assert ctx.company_id == 3
    assert ctx.user.id == 7
    assert ctx.is_primary is True


def test_company_id_comes_from_the_profile_not_the_request():
    """The only source of company_id is the caller's own CompanyAdmin row.

    require_company_admin takes no company argument at all, so there is no
    parameter a caller could use to reach another school's records.
    """
    import inspect

    params = set(inspect.signature(require_company_admin).parameters)
    assert params == {"current_user", "db"}


def test_user_without_a_company_admin_profile_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _call(_user(), _db(profile=None))
    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "COMPANY_ADMIN_REQUIRED"


@pytest.mark.parametrize(
    "account_status", [UserStatus.INACTIVE, UserStatus.SUSPENDED]
)
def test_inactive_account_is_rejected_before_any_lookup(account_status):
    db = _db()
    with pytest.raises(HTTPException) as exc:
        _call(_user(status=account_status), db)
    assert exc.value.detail["code"] == "COMPANY_ADMIN_ACCOUNT_INACTIVE"
    db.query.assert_not_called()


def test_deactivated_company_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _call(_user(), _db(_profile(), _company(is_active=False)))
    assert exc.value.detail["code"] == "COMPANY_INACTIVE"


def test_dangling_profile_with_missing_company_is_rejected():
    with pytest.raises(HTTPException) as exc:
        _call(_user(), _db(_profile(), None))
    assert exc.value.detail["code"] == "COMPANY_INACTIVE"


def test_non_primary_admin_is_still_authorized():
    ctx = _call(_user(), _db(_profile(is_primary=False), _company()))
    assert ctx.is_primary is False
    assert ctx.company_id == 3
