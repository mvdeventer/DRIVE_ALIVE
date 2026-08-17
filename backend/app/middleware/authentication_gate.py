"""Require a signed-in user for every endpoint that is not explicitly public.

Registered once on the application, so it runs for every route including
ones added later. That is the whole idea: authentication stops being
something each endpoint has to remember and becomes something an endpoint
has to deliberately opt out of, in ``public_routes.PUBLIC_ROUTES``.

It enforces *authentication* only — who you are. Authorisation, which is
what you may then do, stays where it was: ``require_admin``,
``require_company_admin``, and the ownership checks inside handlers. Those
dependencies still run, so nothing here weakens an existing guard; this
only closes the gap underneath them.

Token validation is delegated to ``get_current_user`` rather than
reimplemented, so cookie-versus-header handling and single-session
enforcement cannot drift from the rest of the application.
"""

from typing import Optional

from fastapi import Cookie, Depends, HTTPException, Request, status
from sqlalchemy.orm import Session

from ..database import get_db
from ..models.user import User, UserRole
from .public_routes import FIRST_RUN_ONLY_ROUTES, PUBLIC_ROUTES


def _matched_route(request: Request) -> Optional[tuple]:
    """The (method, template) pair FastAPI routed this request to.

    Uses the template rather than the raw URL so that a path parameter can
    never be crafted to impersonate an allowlisted path.
    """
    route = request.scope.get("route")
    path = getattr(route, "path", None)
    if path is None:
        return None
    return (request.method.upper(), path)


def _platform_has_admin(db: Session) -> bool:
    return (
        db.query(User.id).filter(User.role == UserRole.ADMIN).first() is not None
    )


async def authentication_gate(
    request: Request,
    db: Session = Depends(get_db),
    access_token: Optional[str] = Cookie(None),
) -> None:
    """Refuse anonymous access to anything not on the allowlist."""
    # CORS preflight carries no credentials by design, and reveals nothing.
    if request.method.upper() == "OPTIONS":
        return

    if getattr(request.scope.get("route"), "name", None) == "frontend":
        return

    matched = _matched_route(request)
    if matched is None:
        # No route matched: FastAPI will answer 404 on its own, and there is
        # nothing to protect.
        return

    if matched in PUBLIC_ROUTES:
        return

    if matched in FIRST_RUN_ONLY_ROUTES and not _platform_has_admin(db):
        # Genuinely first run — there is nobody to authenticate as yet.
        return

    # Imported here rather than at module scope: routes.auth imports from the
    # middleware package, so a top-level import closes the loop.
    from ..routes.auth import get_current_user

    user = await get_current_user(request=request, db=db, access_token=access_token)

    # The first-run endpoints are administrative once setup is done. Checked
    # here because they are otherwise anonymous by design and so have no
    # dependency of their own to carry the rule.
    if matched in FIRST_RUN_ONLY_ROUTES and user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Administrator access required.",
        )
