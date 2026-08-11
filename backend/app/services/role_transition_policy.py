"""Centralized role transition policy for registration and role changes."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.company_admin import CompanyAdmin
from ..models.user import (
    Instructor,
    InstructorVerificationStatus,
    Student,
    User,
    UserRole,
)


class TransitionChannel(str, Enum):
    """Entry points where role transitions can be requested."""

    PUBLIC_REGISTRATION = "public_registration"
    ADMIN_GRANT = "admin_grant"
    INITIAL_SETUP = "initial_setup"
    COMPANY_REGISTRATION = "company_registration"
    SCHOOL_ENROLMENT = "school_enrolment"


class RoleTransitionPolicy:
    """Policy engine for allowed role transitions."""

    _MATRIX: dict[TransitionChannel, dict[Optional[UserRole], set[UserRole]]] = {
        TransitionChannel.PUBLIC_REGISTRATION: {
            None: {UserRole.STUDENT, UserRole.INSTRUCTOR},
            UserRole.STUDENT: {UserRole.INSTRUCTOR},
            UserRole.INSTRUCTOR: {UserRole.STUDENT},
            UserRole.ADMIN: {UserRole.STUDENT, UserRole.INSTRUCTOR},
            # A school administrator may also learn or teach personally.
            UserRole.COMPANY_ADMIN: {UserRole.STUDENT, UserRole.INSTRUCTOR},
        },
        # An admin may create or upgrade any role. `_validate_actor` rejects a
        # non-admin actor on this channel, so every target here is admin-only by
        # construction — that is what keeps ADMIN itself ungrantable by anyone
        # else. A role the user already holds is omitted; the routes raise their
        # own 400 for "already has this role".
        TransitionChannel.ADMIN_GRANT: {
            None: {UserRole.ADMIN, UserRole.STUDENT, UserRole.INSTRUCTOR},
            UserRole.STUDENT: {UserRole.ADMIN, UserRole.INSTRUCTOR},
            UserRole.INSTRUCTOR: {UserRole.ADMIN, UserRole.STUDENT},
            UserRole.ADMIN: {UserRole.ADMIN, UserRole.STUDENT, UserRole.INSTRUCTOR},
            UserRole.COMPANY_ADMIN: {
                UserRole.ADMIN,
                UserRole.STUDENT,
                UserRole.INSTRUCTOR,
            },
        },
        TransitionChannel.INITIAL_SETUP: {
            None: {UserRole.ADMIN},
        },
        # Registering a driving school. Open to the public like instructor and
        # student registration, but it can only ever mint COMPANY_ADMIN — the
        # global ADMIN role stays reachable through ADMIN_GRANT/INITIAL_SETUP only.
        TransitionChannel.COMPANY_REGISTRATION: {
            None: {UserRole.COMPANY_ADMIN},
            UserRole.STUDENT: {UserRole.COMPANY_ADMIN},
            UserRole.INSTRUCTOR: {UserRole.COMPANY_ADMIN},
            UserRole.ADMIN: {UserRole.COMPANY_ADMIN},
            # One school per administrator. Absent-key would fail closed too,
            # but stating it makes the rule deliberate rather than incidental.
            # AuthService.create_company_admin refuses earlier with a clearer
            # message; this is the backstop.
            UserRole.COMPANY_ADMIN: set(),
        },
        # A driving school signing up one of its own learners. Only ever mints
        # a student, and ``_validate_actor`` requires the actor to actually run
        # a school — this channel marks the learner as the school's own, which
        # exempts their bookings from commission.
        TransitionChannel.SCHOOL_ENROLMENT: {
            None: {UserRole.STUDENT},
            UserRole.INSTRUCTOR: {UserRole.STUDENT},
            UserRole.COMPANY_ADMIN: {UserRole.STUDENT},
            UserRole.ADMIN: {UserRole.STUDENT},
            # Already a learner; the route reports that more clearly.
            UserRole.STUDENT: set(),
        },
    }

    @staticmethod
    def _validate_actor(channel: TransitionChannel, actor_user: Optional[User]) -> None:
        """Enforce channel-specific actor requirements."""
        if channel == TransitionChannel.ADMIN_GRANT:
            if not actor_user or actor_user.role != UserRole.ADMIN:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only admins may grant admin role.",
                )
        if channel == TransitionChannel.SCHOOL_ENROLMENT and actor_user is None:
            # The route resolves the school from the caller's own profile; an
            # actorless call would have no school to attribute the learner to.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only a driving school may enrol its own learners.",
            )

    @staticmethod
    def _get_effective_roles(db: Session, user: User) -> set[UserRole]:
        """Resolve all effective roles for a user in the multi-role model."""
        roles: set[UserRole] = {user.role}
        if db.query(Student).filter(Student.user_id == user.id).first():
            roles.add(UserRole.STUDENT)
        if db.query(Instructor).filter(Instructor.user_id == user.id).first():
            roles.add(UserRole.INSTRUCTOR)
        if db.query(CompanyAdmin).filter(CompanyAdmin.user_id == user.id).first():
            roles.add(UserRole.COMPANY_ADMIN)
        return roles

    @classmethod
    def _allowed_targets(
        cls,
        channel: TransitionChannel,
        source_roles: set[Optional[UserRole]],
    ) -> set[UserRole]:
        """Get all allowed target roles for a source-role set in a channel."""
        channel_rules = cls._MATRIX.get(channel, {})
        allowed: set[UserRole] = set()
        for source_role in source_roles:
            allowed.update(channel_rules.get(source_role, set()))
        return allowed

    @classmethod
    def assert_transition_allowed(
        cls,
        *,
        db: Session,
        target_role: UserRole,
        channel: TransitionChannel,
        existing_user: Optional[User] = None,
        actor_user: Optional[User] = None,
    ) -> None:
        """Raise HTTPException if the requested transition is not permitted."""
        cls._validate_actor(channel, actor_user)

        if existing_user is None:
            source_roles: set[Optional[UserRole]] = {None}
        else:
            source_roles = {role for role in cls._get_effective_roles(db, existing_user)}

        allowed_targets = cls._allowed_targets(channel, source_roles)
        if target_role in allowed_targets:
            return

        source_labels = sorted(role.value for role in source_roles if role is not None)
        source_text = ", ".join(source_labels) if source_labels else "unregistered"
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=(
                f"Role transition blocked by policy: '{source_text}' cannot transition "
                f"to '{target_role.value}' via '{channel.value}'."
            ),
        )

    @classmethod
    def get_available_runtime_roles(
        cls,
        *,
        db: Session,
        user: User,
    ) -> set[str]:
        """Return role names available for login role selection."""
        return {role.value for role in cls._get_effective_roles(db, user)}

    @staticmethod
    def select_runtime_role(
        *,
        requested_role: Optional[str],
        available_roles: set[str],
    ) -> str:
        """Resolve and validate the requested role against available runtime roles."""
        if not available_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="No available roles found for this account.",
            )

        selected_role = requested_role or next(iter(available_roles))
        if selected_role not in available_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid role selection for this account.",
            )

        valid_runtime_roles = {role.value for role in UserRole}
        if selected_role not in valid_runtime_roles:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid runtime role resolved for this account.",
            )

        return selected_role

    @staticmethod
    def assert_runtime_role_ready(
        *,
        db: Session,
        user: User,
        selected_role: str,
    ) -> None:
        """Ensure the selected runtime role is in a login-ready state."""
        if selected_role != UserRole.INSTRUCTOR.value:
            return

        instructor = db.query(Instructor).filter(Instructor.user_id == user.id).first()
        if not instructor:
            return

        if instructor.verification_status in (
            InstructorVerificationStatus.VERIFIED.value,
            None,
        ):
            return

        admin = db.query(User).filter(User.role == UserRole.ADMIN).first()
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail={
                "code": "ACCOUNT_PENDING_VERIFICATION",
                "message": (
                    "Your instructor account is pending verification. "
                    "Please contact the administrator."
                ),
                "verification_status": instructor.verification_status,
                "admin_email": admin.email if admin else None,
                "admin_phone": admin.phone if admin else None,
                "admin_name": (
                    f"{admin.first_name} {admin.last_name}".strip() if admin else None
                ),
            },
        )
