"""processing.eo_job gains provider_key/collection_key -- request identity, not inferred (multi-sensor programme)."""

from pathlib import Path

from alembic import context, op

revision = "0009_eo_job_provider_collection"
# NOTE for whoever integrates this branch: 0008_spatial_read_indexes is a
# concurrent session's migration that was UNCOMMITTED when this revision was
# authored (backend/app/services/ingestion/spatial/, also uncommitted). It
# was chained here, rather than off 0007, because both files coexist in the
# same versions/ directory regardless of git status, and alembic builds one
# DAG from every file on disk -- leaving this as a sibling of 0007 produces
# two heads and breaks conftest.py's `command.upgrade(config, "head")` for
# BOTH sessions' test suites (test_spatial_forests.py included). If 0008 is
# renamed, rebased, or dropped before merging, this revision's down_revision
# must be updated to match rather than assumed stable.
down_revision = "0008_spatial_read_indexes"
branch_labels = None
depends_on = None


def upgrade():
    sql = (
        Path(__file__).resolve().parents[1] / "sql" / "0009_eo_job_provider_collection.sql"
    ).read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    op.drop_column("eo_job", "collection_key", schema="processing")
    op.drop_column("eo_job", "provider_key", schema="processing")
