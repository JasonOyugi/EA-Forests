"""Add geo.geometry_observation.method value 'repository_derived'."""

from pathlib import Path

from alembic import context, op

revision = "0004_geometry_method"
down_revision = "0003_geo_aoi"
branch_labels = None
depends_on = None


def upgrade():
    sql = (
        Path(__file__).resolve().parents[1]
        / "sql"
        / "0004_geometry_method_repository_derived.sql"
    ).read_text(encoding="utf-8")
    if context.is_offline_mode():
        op.get_context().impl.static_output(sql)
    else:
        op.get_bind().exec_driver_sql(sql, execution_options={"no_parameters": True})


def downgrade():
    # Refuses to run if any row already uses the value being removed.
    op.drop_constraint(
        "geometry_observation_method_check", "geometry_observation", schema="geo", type_="check"
    )
    op.create_check_constraint(
        "geometry_observation_method_check",
        "geometry_observation",
        "method IN ('surveyed','gps','official_kml','digitised','remote_sensing','geocoded',"
        "'reported_coordinate','centroid_estimate','display_offset')",
        schema="geo",
    )
