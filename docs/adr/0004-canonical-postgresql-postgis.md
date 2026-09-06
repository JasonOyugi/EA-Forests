# ADR 0004: PostgreSQL/PostGIS as canonical system of record

Status: accepted; Canonical State v0.1.

Use PostgreSQL/PostGIS, SQLAlchemy 2 Core and Alembic. Spatial validity, foreign
keys, timezone-aware ranges, transactional supersession and deferred lineage
constraints are operational requirements. JSON files remain legacy read sources
during incremental migration. SQLite is not used as a semantic substitute in tests.

Local Docker Compose uses the open-source PostGIS image. A private local filesystem
holds content-addressed artifacts. No Redis, queues, document/graph databases or
paid services are introduced. Backups must include both database and artifacts.

Consequence: integration tests require real PostgreSQL/PostGIS. Models that use
manual payloads continue to run without a database connection.
