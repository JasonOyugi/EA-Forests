"""Target-database safety guard (docs/architecture/CANONICAL_DATABASE_RUNTIME.md):
operational scripts must print and, when asked, verify which database they
are actually connected to -- never assume it from a URL string, a script
default, or a database's name alone.
"""

import pytest

from app.db.target_guard import (
    DatabaseMismatchError,
    describe_target,
    format_banner,
    require_database,
)

pytestmark = pytest.mark.integration


def test_describe_target_reads_live_connection(database_engine):
    target = describe_target(database_engine)

    assert target.database == database_engine.url.database
    assert target.database.endswith("_test")
    assert target.host
    assert target.port
    # Migrated by the database_engine fixture (alembic upgrade head) before this runs.
    assert target.alembic_revision is not None
    assert target.entity_count >= 0
    assert target.aoi_count >= 0


def test_format_banner_includes_every_field(database_engine):
    target = describe_target(database_engine)
    banner = format_banner(target, label="Test banner")

    assert "Test banner:" in banner
    assert target.database in banner
    assert str(target.port) in banner
    assert "core.entity" in banner
    assert "geo.aoi" in banner


def test_require_database_passes_on_match(database_engine):
    target = describe_target(database_engine)

    result = require_database(database_engine, target.database)

    assert result.database == target.database


def test_require_database_raises_on_mismatch(database_engine):
    with pytest.raises(DatabaseMismatchError):
        require_database(database_engine, "definitely_not_the_right_database")


def test_require_database_is_a_noop_check_when_expected_is_none(database_engine):
    # No --expected-database given: prints, never raises. This is what keeps
    # routine workers from being forced into an interactive/blocking check.
    result = require_database(database_engine, None)

    assert result.database == database_engine.url.database
