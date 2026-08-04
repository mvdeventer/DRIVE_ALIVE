"""Admin-created student and instructor accounts.

Public self-registration is unchanged; these cover the ADMIN_GRANT channel that
AuthService now accepts, and specifically that widening the policy matrix did not
open a path for non-admins.
"""
import inspect
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.services.auth import AuthService
from app.services.role_transition_policy import TransitionChannel


def _payload():
    """Minimal object with the only attribute read before the policy check."""
    return SimpleNamespace(email="walkin@test.com")


@pytest.mark.parametrize(
    "creator",
    [AuthService.create_student, AuthService.create_instructor],
    ids=["student", "instructor"],
)
def test_admin_grant_rejects_non_admin_actor(creator):
    """A student actor must not be able to mint accounts via ADMIN_GRANT."""
    with pytest.raises(HTTPException) as exc:
        creator(
            db=MagicMock(),
            **{creator.__name__.replace("create_", "") + "_data": _payload()},
            channel=TransitionChannel.ADMIN_GRANT,
            actor_user=SimpleNamespace(role="student"),
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == "Only admins may grant admin role."


@pytest.mark.parametrize(
    "creator",
    [AuthService.create_student, AuthService.create_instructor],
    ids=["student", "instructor"],
)
def test_admin_grant_rejects_missing_actor(creator):
    """No actor at all is also refused — the channel is never anonymous."""
    with pytest.raises(HTTPException) as exc:
        creator(
            db=MagicMock(),
            **{creator.__name__.replace("create_", "") + "_data": _payload()},
            channel=TransitionChannel.ADMIN_GRANT,
            actor_user=None,
        )

    assert exc.value.status_code == 403


@pytest.mark.parametrize(
    "creator",
    [AuthService.create_student, AuthService.create_instructor],
    ids=["student", "instructor"],
)
def test_public_registration_remains_the_default_channel(creator):
    """Regression guard: public signup must not start requiring an admin actor."""
    params = inspect.signature(creator).parameters
    assert params["channel"].default == TransitionChannel.PUBLIC_REGISTRATION
    assert params["actor_user"].default is None


def test_admin_created_instructor_is_auto_verified_in_source():
    """The ADMIN_GRANT branch must set VERIFIED, not PENDING_ADMIN.

    The surrounding creation flow needs a real database, so this pins the branch
    itself; the end-to-end behaviour is verified in the browser walkthrough.
    """
    src = inspect.getsource(AuthService.create_instructor)
    branch = src.split("if channel == TransitionChannel.ADMIN_GRANT:")[1]
    branch = branch.split("elif")[0]
    assert "InstructorVerificationStatus.VERIFIED.value" in branch
    assert "PENDING_ADMIN" not in branch
