"""Indexes for immutable spatial evidence identity/replay; no new domain tables."""
from alembic import op

revision = "0008_spatial_read_indexes"
down_revision = "0007_eo_job_reliability"
branch_labels = None
depends_on = None


def upgrade():
    op.execute("""CREATE INDEX ix_spatial_source_registry ON evidence.source
        ((metadata->>'spatial_source_key'),(metadata->>'registry_hash'))
        WHERE metadata ? 'spatial_source_key'""")
    op.execute("""CREATE INDEX ix_spatial_evidence_replay ON evidence.evidence_item
        (source_id,content_hash) WHERE kind IN ('spatial_polygon','spatial_quarantine')""")
    op.execute("""CREATE INDEX ix_spatial_observation_identity ON geo.geometry_observation
        ((metadata->>'spatial_source_key'),(metadata->>'identity_key'),recorded_at DESC)
        WHERE metadata ? 'spatial_source_key'""")


def downgrade():
    op.execute("DROP INDEX geo.ix_spatial_observation_identity")
    op.execute("DROP INDEX evidence.ix_spatial_evidence_replay")
    op.execute("DROP INDEX evidence.ix_spatial_source_registry")
