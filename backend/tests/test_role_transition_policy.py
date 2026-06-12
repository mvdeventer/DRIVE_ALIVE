from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException

from app.models.user import UserRole
from app.services.role_transition_policy import (
    RoleTransitionPolicy,
    TransitionChannel,
)


def test_public_registration_allows_student_and_instructor_for_new_user():
    db = MagicMock()

    RoleTransitionPolicy.assert_transition_allowed(
        db=db,
        target_role=UserRole.STUDENT,
        channel=TransitionChannel.PUBLIC_REGISTRATION,
        existing_user=None,
    )
    RoleTransitionPolicy.assert_transition_allowed(
        db=db,
        target_role=UserRole.INSTRUCTOR,
        channel=TransitionChannel.PUBLIC_REGISTRATION,
        existing_user=None,
    )


def test_public_registration_blocks_admin_for_new_user():
    db = MagicMock()

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_transition_allowed(
            db=db,
            target_role=UserRole.ADMIN,
            channel=TransitionChannel.PUBLIC_REGISTRATION,
            existing_user=None,
        )

    assert exc.value.status_code == 403


def test_admin_grant_requires_admin_actor():
    db = MagicMock()
    non_admin_actor = SimpleNamespace(role=UserRole.STUDENT)

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_transition_allowed(
            db=db,
            target_role=UserRole.ADMIN,
            channel=TransitionChannel.ADMIN_GRANT,
            existing_user=SimpleNamespace(role=UserRole.STUDENT),
            actor_user=non_admin_actor,
        )

    assert exc.value.status_code == 403
    assert exc.value.detail == 'Only admins may grant admin role.'


def test_select_runtime_role_rejects_invalid_selection():
    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.select_runtime_role(
            requested_role='school_owner',
            available_roles={'student', 'instructor'},
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == 'Invalid role selection for this account.'


def test_company_owner_maps_to_instructor_runtime_role_only():
    db = MagicMock()
    company_owner_user = SimpleNamespace(
        id=99,
        role=UserRole.INSTRUCTOR,
        is_company_owner=True,
    )

    available = RoleTransitionPolicy.get_available_runtime_roles(db=db, user=company_owner_user)

    assert 'instructor' in available
    assert 'school_owner' not in available
