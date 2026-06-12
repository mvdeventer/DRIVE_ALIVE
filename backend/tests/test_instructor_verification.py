"""Instructor verification workflow: gate login on verification_status."""
from types import SimpleNamespace
from unittest.mock import MagicMock, call

import pytest
from fastapi import HTTPException

from app.models.user import InstructorVerificationStatus, UserRole
from app.services.role_transition_policy import RoleTransitionPolicy


def _user(role=UserRole.INSTRUCTOR):
    return SimpleNamespace(id=42, email="instr@test.com", role=role)


def _db_with_instructor(verification_status):
    """Mock DB whose Instructor query returns an instructor with the given status."""
    db = MagicMock()
    instructor = SimpleNamespace(
        user_id=42,
        verification_status=verification_status,
    )
    db.query.return_value.filter.return_value.first.return_value = instructor
    return db


def _db_no_instructor():
    """Mock DB whose Instructor query returns None (no instructor profile)."""
    db = MagicMock()
    db.query.return_value.filter.return_value.first.return_value = None
    return db


# ── assert_runtime_role_ready ─────────────────────────────────────────────────

def test_pending_admin_instructor_blocked():
    db = _db_with_instructor(InstructorVerificationStatus.PENDING_ADMIN.value)
    # Also need the admin query to return something
    admin = SimpleNamespace(
        email="admin@test.com", phone="+27110000000", first_name="Admin", last_name="User"
    )
    db.query.return_value.filter.return_value.first.side_effect = [
        SimpleNamespace(user_id=42, verification_status=InstructorVerificationStatus.PENDING_ADMIN.value),
        admin,
    ]

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_runtime_role_ready(
            db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
        )

    assert exc.value.status_code == 403
    assert exc.value.detail["code"] == "ACCOUNT_PENDING_VERIFICATION"


def test_pending_company_instructor_blocked():
    db = MagicMock()
    instructor = SimpleNamespace(
        user_id=42,
        verification_status=InstructorVerificationStatus.PENDING_COMPANY.value,
    )
    admin = SimpleNamespace(
        email="admin@test.com", phone="+27110000000", first_name="Admin", last_name="User"
    )
    db.query.return_value.filter.return_value.first.side_effect = [instructor, admin]

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_runtime_role_ready(
            db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
        )

    assert exc.value.status_code == 403


def test_rejected_instructor_blocked():
    db = MagicMock()
    instructor = SimpleNamespace(
        user_id=42,
        verification_status=InstructorVerificationStatus.REJECTED.value,
    )
    admin = SimpleNamespace(
        email="admin@test.com", phone="+27110000000", first_name="Admin", last_name="User"
    )
    db.query.return_value.filter.return_value.first.side_effect = [instructor, admin]

    with pytest.raises(HTTPException) as exc:
        RoleTransitionPolicy.assert_runtime_role_ready(
            db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
        )

    assert exc.value.status_code == 403


def test_verified_instructor_allowed():
    db = _db_with_instructor(InstructorVerificationStatus.VERIFIED.value)

    # Should not raise
    RoleTransitionPolicy.assert_runtime_role_ready(
        db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
    )


def test_verification_status_none_allowed():
    """None status (legacy) is treated as verified."""
    db = _db_with_instructor(None)

    RoleTransitionPolicy.assert_runtime_role_ready(
        db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
    )


def test_no_instructor_profile_skips_check():
    """User with INSTRUCTOR role but no Instructor profile skips the check."""
    db = _db_no_instructor()

    RoleTransitionPolicy.assert_runtime_role_ready(
        db=db, user=_user(), selected_role=UserRole.INSTRUCTOR.value
    )


def test_student_role_skips_instructor_check():
    """Student login does not trigger the instructor verification gate."""
    db = MagicMock()

    RoleTransitionPolicy.assert_runtime_role_ready(
        db=db, user=_user(UserRole.STUDENT), selected_role=UserRole.STUDENT.value
    )

    # DB should not be queried at all for non-instructor roles
    db.query.assert_not_called()


def test_admin_role_skips_instructor_check():
    db = MagicMock()

    RoleTransitionPolicy.assert_runtime_role_ready(
        db=db, user=_user(UserRole.ADMIN), selected_role=UserRole.ADMIN.value
    )

    db.query.assert_not_called()
