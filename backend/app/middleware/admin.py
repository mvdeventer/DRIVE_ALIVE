"""
Admin authentication and authorization middleware
"""

from typing import Annotated

from fastapi import Depends, HTTPException, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole, UserStatus
from ..routes.auth import get_current_user


async def require_admin(
    current_user: Annotated[User, Depends(get_current_user)],
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to ensure the current user is an admin

    Raises:
        HTTPException: If user is not an admin or account is not active
    """
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator privileges required",
        )

    if current_user.status != UserStatus.ACTIVE:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin account is not active",
        )

    return current_user


async def require_admin_or_self(
    current_user: Annotated[User, Depends(get_current_user)],
    target_user_id: int,
    db: Session = Depends(get_db),
) -> User:
    """
    Dependency to ensure the current user is either an admin or accessing their own data

    Args:
        current_user: The authenticated user
        target_user_id: The ID of the user being accessed
        db: Database session

    Raises:
        HTTPException: If user is neither admin nor accessing their own data
    """
    if current_user.role != UserRole.ADMIN and current_user.id != target_user_id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access denied: Admin privileges or self-access required",
        )

    return current_user
