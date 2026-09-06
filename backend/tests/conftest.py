import os
from pathlib import Path

import pytest
from alembic import command
from alembic.config import Config
from sqlalchemy.engine import make_url
from sqlalchemy.orm import Session

from app.db.session import engine_for
from app.services.evidence.artifacts import LocalArtifactStore
from app.services.state.registry import bootstrap


@pytest.fixture(scope="session")
def database_engine():
    url = os.getenv("CANONICAL_TEST_DATABASE_URL")
    if not url:
        pytest.skip(
            "Set CANONICAL_TEST_DATABASE_URL to a disposable PostgreSQL/PostGIS *_test database"
        )
    if not make_url(url).database.endswith("_test"):
        pytest.fail("Integration tests require a separate database name ending in _test")
    previous = os.environ.get("CANONICAL_DATABASE_URL")
    os.environ["CANONICAL_DATABASE_URL"] = url
    config = Config(str(Path(__file__).resolve().parents[1] / "alembic.ini"))
    command.upgrade(config, "head")
    engine = engine_for(url)
    yield engine
    engine.dispose()
    if previous is None:
        os.environ.pop("CANONICAL_DATABASE_URL", None)
    else:
        os.environ["CANONICAL_DATABASE_URL"] = previous


@pytest.fixture
def db(database_engine):
    with Session(database_engine) as session:
        session.begin()
        bootstrap(session)
        yield session
        session.rollback()


@pytest.fixture
def store(tmp_path):
    return LocalArtifactStore(tmp_path)
