"""Preserve independent provenance for identical bytes; require permission reasons."""

from alembic import op

revision = "0002_integrity"
down_revision = "0001_canonical_state"
branch_labels = None
depends_on = None


def upgrade():
    op.drop_constraint(
        "uq_raw_ingest_content_hash_parser_version_original_filename",
        "raw_ingest",
        schema="evidence",
        type_="unique",
    )
    op.create_unique_constraint(
        "uq_raw_ingest_source_content_parser_filename",
        "raw_ingest",
        ["source_id", "content_hash", "parser_version", "original_filename"],
        schema="evidence",
    )
    op.create_check_constraint(
        "ck_world_synthetic_permission",
        "world",
        "NOT allow_synthetic OR (synthetic_permission_reason IS NOT NULL AND length(trim(synthetic_permission_reason)) > 0)",
        schema="core",
    )
    op.create_check_constraint(
        "ck_verification_money_currency",
        "task",
        "(currency IS NULL OR currency IN ('UGX','USD')) AND (num_nonnulls(estimated_cost,expected_decision_value)=0 OR currency IS NOT NULL)",
        schema="verification",
    )


def downgrade():
    op.drop_constraint(
        "ck_verification_money_currency", "task", schema="verification", type_="check"
    )
    op.drop_constraint("ck_world_synthetic_permission", "world", schema="core", type_="check")
    op.drop_constraint(
        "uq_raw_ingest_source_content_parser_filename",
        "raw_ingest",
        schema="evidence",
        type_="unique",
    )
    # Refuses rollback if independently sourced duplicates now exist; never deletes evidence.
    op.create_unique_constraint(
        "uq_raw_ingest_content_hash_parser_version_original_filename",
        "raw_ingest",
        ["content_hash", "parser_version", "original_filename"],
        schema="evidence",
    )
