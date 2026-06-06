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
