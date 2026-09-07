"""Local-pilot browser session bridge for the canonical administrative API.

``CANONICAL_API_TOKEN`` is the canonical admin credential and must stay
server-side only -- it is never embedded in a ``VITE_*`` variable, never
placed in browser storage, and never sent in a query string. A loopback-only
bootstrap mints a short-lived HttpOnly session cookie instead, so a browser
on the same developer machine can call ``/api/canonical/*`` without ever
possessing the token. Direct ``Authorization: Bearer <token>`` access is
unchanged for CLI/admin tooling.

This is a local single-developer pilot bridge, not production multi-tenant
auth: sessions live in an in-process dict (lost on backend restart) and
``bootstrap`` only succeeds for a request whose TCP peer is the loopback
interface. Origin/CSRF checks apply because a same-origin HttpOnly cookie is
still ambient browser credential -- any state-changing request authenticated
via the cookie (including the bootstrap call itself) is rejected unless its
``Origin``/``Referer`` matches an allowed local dev origin.
"""

from __future__ import annotations

import os
import secrets
import time

from fastapi import Request

SESSION_COOKIE_NAME = "ea_canonical_session"
SESSION_LIFETIME_SECONDS = 2 * 60 * 60  # bounded/short-lived, pilot default
LOOPBACK_HOSTS = frozenset({"127.0.0.1", "::1", "localhost"})
SAFE_METHODS = frozenset({"GET", "HEAD", "OPTIONS"})

# session_token -> expiry (epoch seconds). Process-local by design.
_sessions: dict[str, float] = {}


def split_csv_env(value: str | None) -> list[str]:
    if not value:
        return []
    return [item.strip() for item in value.split(",") if item.strip()]


def allowed_origins() -> list[str]:
    origins = split_csv_env(os.getenv("ALLOWED_ORIGINS"))
    if origins:
        return origins

    defaults = [
        "http://127.0.0.1:5173",
        "http://localhost:5173",
        "http://127.0.0.1:5174",
        "http://localhost:5174",
        "http://127.0.0.1:4173",
        "http://localhost:4173",
    ]
    return defaults + split_csv_env(os.getenv("APP_ORIGIN"))


def admin_enabled() -> bool:
    return bool(os.getenv("CANONICAL_API_TOKEN"))


def is_loopback(request: Request) -> bool:
    client = request.client
    return bool(client and client.host in LOOPBACK_HOSTS)


def origin_allowed(request: Request) -> bool:
    origin = request.headers.get("origin")
    if not origin:
        referer = request.headers.get("referer")
        if referer:
            origin = referer.rstrip("/")
    if not origin:
        return False
    return any(origin == allowed or origin.startswith(allowed + "/") for allowed in allowed_origins())


def issue_session() -> tuple[str, int]:
    _prune_expired()
    token = secrets.token_urlsafe(32)
    _sessions[token] = time.time() + SESSION_LIFETIME_SECONDS
    return token, SESSION_LIFETIME_SECONDS


def session_valid(token: str | None) -> bool:
    if not token:
        return False
    expiry = _sessions.get(token)
    if expiry is None:
        return False
    if expiry < time.time():
        _sessions.pop(token, None)
        return False
    return True


def revoke_session(token: str | None) -> None:
    if token:
        _sessions.pop(token, None)


def _prune_expired() -> None:
    now = time.time()
    expired = [token for token, expiry in _sessions.items() if expiry < now]
    for token in expired:
        _sessions.pop(token, None)
