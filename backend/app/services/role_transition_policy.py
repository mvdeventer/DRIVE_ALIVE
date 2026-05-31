"""Centralized role transition policy for registration and role changes."""

from __future__ import annotations

from enum import Enum
from typing import Optional

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from ..models.user import Instructor, Student, User, UserRole


class TransitionChannel(str, Enum):
    """Entry points where role transitions can be requested."""

    PUBLIC_REGISTRATION = "public_registration"
    ADMIN_GRANT = "admin_grant"
    INITIAL_SETUP = "initial_setup"


class RoleTransitionPolicy:
    """Policy engine for allowed role transitions."""

    _MATRIX: dict[TransitionChannel, dict[Optional[UserRole], set[UserRole]]] = {
        TransitionChannel.PUBLIC_REGISTRATION: {
            None: {UserRole.STUDENT, UserRole.INSTRUCTOR},
            UserRole.STUDENT: {UserRole.INSTRUCTOR},
            UserRole.INSTRUCTOR: {UserRole.STUDENT},
            UserRole.ADMIN: {UserRole.STUDENT, UserRole.INSTRUCTOR},
        },
        TransitionChannel.ADMIN_GRANT: {
            None: {UserRole.ADMIN},
            UserRole.STUDENT: {UserRole.ADMIN},
            UserRole.INSTRUCTOR: {UserRole.ADMIN},
            UserRole.ADMIN: {UserRole.ADMIN},
        },
        TransitionChannel.INITIAL_SETUP: {
            None: {UserRole.ADMIN},
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

    @staticmethod
    def _get_effective_roles(db: Session, user: User) -> set[UserRole]:
        """Resolve all effective roles for a user in the multi-role model."""
        roles: set[UserRole] = {user.role}
        if db.query(Student).filter(Student.user_id == user.id).first():
            roles.add(UserRole.STUDENT)
        if db.query(Instructor).filter(Instructor.user_id == user.id).first():
            roles.add(UserRole.INSTRUCTOR)
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

        return selected_role
