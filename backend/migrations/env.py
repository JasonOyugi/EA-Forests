from alembic import context
from sqlalchemy import create_engine, pool

from app.db.schema import SCHEMAS, metadata
from app.db.session import database_url


def include_name(name, type_, parent_names):
    # Autogeneration must never suggest dropping PostGIS extension tables or unrelated schemas.
    return name in SCHEMAS if type_ == "schema" else True


if context.is_offline_mode():
    context.configure(
        url=database_url(), target_metadata=metadata, literal_binds=True, include_schemas=True
    )
    with context.begin_transaction():
        context.run_migrations()
else:
    engine = create_engine(database_url(), poolclass=pool.NullPool)
    with engine.connect() as connection:
        context.configure(
            connection=connection,
            target_metadata=metadata,
            include_schemas=True,
            include_name=include_name,
        )
        with context.begin_transaction():
            context.run_migrations()
