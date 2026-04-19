"""Identity middleware — issues and reads the anonymous user_id cookie.

A new UUID is minted on first visit and stored in a long-lived HttpOnly cookie.
Every request after that carries the same id, giving us a stable per-browser
identity without requiring any auth.

Usage:
    app.add_middleware(IdentityMiddleware)

    # Inside any route handler:
    from backend.src.middleware.identity import get_user_id
    user_id = get_user_id(request)
"""
from __future__ import annotations

import uuid
from datetime import timedelta

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint
from starlette.responses import Response as StarletteResponse

COOKIE_NAME = "uid"
COOKIE_MAX_AGE = int(timedelta(days=365).total_seconds())  # 1 year


class IdentityMiddleware(BaseHTTPMiddleware):
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> StarletteResponse:
        existing = request.cookies.get(COOKIE_NAME)
        user_id = request.headers.get("X-User-ID") or existing or str(uuid.uuid4())
        # Stash on request.state so route handlers can read it cheaply.
        request.state.user_id = user_id

        response: StarletteResponse = await call_next(request)

        if not existing:
            response.set_cookie(
                key=COOKIE_NAME,
                value=user_id,
                max_age=COOKIE_MAX_AGE,
                httponly=True,
                samesite="lax",
                secure=False,  # Set to True in production behind HTTPS
            )
        return response


def get_user_id(request: Request) -> str:
    """Return the user_id set by IdentityMiddleware."""
    return request.state.user_id  # type: ignore[no-any-return]
