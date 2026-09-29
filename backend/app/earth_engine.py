from __future__ import annotations

import os

USE_SYSTEM_PROXY_ENV = "EA_FORESTS_USE_SYSTEM_PROXY"

_PROXY_ENV_VARS = (
    "HTTP_PROXY",
    "HTTPS_PROXY",
    "ALL_PROXY",
    "http_proxy",
    "https_proxy",
    "all_proxy",
)


def use_system_proxy() -> bool:
    return os.getenv(USE_SYSTEM_PROXY_ENV, "").lower() in {"1", "true", "yes"}


def configure_earth_engine_network() -> None:
    if use_system_proxy():
        return

    for name in _PROXY_ENV_VARS:
        os.environ.pop(name, None)

    os.environ.setdefault("NO_PROXY", "localhost,127.0.0.1,::1")
    os.environ.setdefault("no_proxy", os.environ["NO_PROXY"])


def earth_engine_project() -> str | None:
    return os.getenv("EARTH_ENGINE_PROJECT") or os.getenv("GOOGLE_CLOUD_PROJECT")


SERVICE_ACCOUNT_KEY_ENV = "EARTH_ENGINE_SERVICE_ACCOUNT_KEY"
_EE_SCOPES = (
    "https://www.googleapis.com/auth/earthengine",
    "https://www.googleapis.com/auth/cloud-platform",
)


def earth_engine_credentials():
    """Server-side credentials, or None to let `ee` use local login / Application Default Credentials.

    Hosts without an attached Google identity (e.g. Vercel) supply a service-account key as JSON in
    EARTH_ENGINE_SERVICE_ACCOUNT_KEY — a server-only secret, never a VITE_/NEXT_PUBLIC_ variable.
    On Cloud Run leave it unset and attach the service account to the service instead.
    """
    raw = os.getenv(SERVICE_ACCOUNT_KEY_ENV)
    if not raw:
        return None

    import json

    from google.oauth2 import service_account

    return service_account.Credentials.from_service_account_info(json.loads(raw), scopes=_EE_SCOPES)
