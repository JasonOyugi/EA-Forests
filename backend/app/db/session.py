import os
from functools import lru_cache

from sqlalchemy import create_engine
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session


@lru_cache(maxsize=4)
def engine_for(url: str):
    parsed = make_url(url)
    if parsed.drivername != "postgresql+psycopg":
        raise ValueError("Canonical state requires postgresql+psycopg and PostGIS")
    return create_engine(url, pool_pre_ping=True, connect_args={"connect_timeout": 5})


def database_url() -> str:
    value = os.getenv("CANONICAL_DATABASE_URL")
    if not value:
        raise RuntimeError("CANONICAL_DATABASE_URL is not configured")
    return value


def session_scope():
    with Session(engine_for(database_url())) as session, session.begin():
        yield session
