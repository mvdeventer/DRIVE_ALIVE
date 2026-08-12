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


def test_admin_can_create_student_and_instructor_accounts():
    """An admin creating a brand-new student or instructor must be permitted.

    This was previously blocked: ADMIN_GRANT only listed ADMIN as a target, so
    the admin "create user" path could produce admins and nothing else.
    """
    db = MagicMock()
    admin_actor = SimpleNamespace(role=UserRole.ADMIN)

    for target in (UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN):
        RoleTransitionPolicy.assert_transition_allowed(
            db=db,
            target_role=target,
            channel=TransitionChannel.ADMIN_GRANT,
            existing_user=None,
            actor_user=admin_actor,
        )


def test_admin_can_upgrade_existing_student_to_instructor():
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    admin_actor = SimpleNamespace(role=UserRole.ADMIN)
    student = SimpleNamespace(id=7, role=UserRole.STUDENT)

    RoleTransitionPolicy.assert_transition_allowed(
        db=db,
        target_role=UserRole.INSTRUCTOR,
        channel=TransitionChannel.ADMIN_GRANT,
        existing_user=student,
        actor_user=admin_actor,
    )


def test_non_admin_cannot_create_student_or_instructor_via_admin_grant():
    """Widening ADMIN_GRANT must not let a non-admin use the channel at all."""
    db = MagicMock()
    student_actor = SimpleNamespace(role=UserRole.STUDENT)

    for target in (UserRole.STUDENT, UserRole.INSTRUCTOR, UserRole.ADMIN):
        with pytest.raises(HTTPException) as exc:
            RoleTransitionPolicy.assert_transition_allowed(
                db=db,
                target_role=target,
                channel=TransitionChannel.ADMIN_GRANT,
                existing_user=None,
                actor_user=student_actor,
            )
        assert exc.value.status_code == 403


def test_public_registration_still_blocks_admin_after_widening():
    """The ADMIN_GRANT widening must not leak ADMIN into public registration."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_transition_allowed(
            db=db,
            target_role=UserRole.ADMIN,
            channel=TransitionChannel.PUBLIC_REGISTRATION,
            existing_user=SimpleNamespace(id=3, role=UserRole.STUDENT),
        )

    assert exc.value.status_code == 403


def test_student_can_become_instructor_via_public_registration():
    """The self-upgrade path you asked about — already permitted, now pinned."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None

    RoleTransitionPolicy.assert_transition_allowed(
        db=db,
        target_role=UserRole.INSTRUCTOR,
        channel=TransitionChannel.PUBLIC_REGISTRATION,
        existing_user=SimpleNamespace(id=5, role=UserRole.STUDENT),
    )


def test_select_runtime_role_rejects_invalid_selection():
    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.select_runtime_role(
            requested_role='school_owner',
            available_roles={'student', 'instructor'},
        )

    assert exc.value.status_code == 400
    assert exc.value.detail == 'Invalid role selection for this account.'


def test_company_admin_profile_yields_the_company_admin_role():
    """A CompanyAdmin profile row makes the role selectable at login.

    Roles are resolved by profile-row existence, the same way student and
    instructor are. Without this the role could be stored on the User row but
    never offered in the multi-role picker.
    """
    db = MagicMock()
    # _get_effective_roles queries Student, Instructor, then CompanyAdmin in
    # that order; only the third finds a row.
    db.query.return_value.filter.return_value.first.side_effect = [
        None,
        None,
        SimpleNamespace(id=1, user_id=42, company_id=3),
    ]
    user = SimpleNamespace(id=42, role=UserRole.COMPANY_ADMIN)

    available = RoleTransitionPolicy.get_available_runtime_roles(db=db, user=user)

    assert available == {'company_admin'}


def test_company_registration_channel_cannot_mint_a_platform_admin():
    """The public school-registration channel is limited to COMPANY_ADMIN.

    If this ever allows ADMIN, anyone could self-register as the platform
    operator.
    """
    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_transition_allowed(
            db=MagicMock(),
            target_role=UserRole.ADMIN,
            channel=TransitionChannel.COMPANY_REGISTRATION,
            existing_user=None,
        )

    assert exc.value.status_code == 403


def test_company_registration_channel_allows_an_unregistered_visitor():
    RoleTransitionPolicy.assert_transition_allowed(
        db=MagicMock(),
        target_role=UserRole.COMPANY_ADMIN,
        channel=TransitionChannel.COMPANY_REGISTRATION,
        existing_user=None,
    )


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
