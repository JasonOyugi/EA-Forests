# EO / spatial migration reconciliation

Date: 2026-09-09. Branch `feature/uganda-cfr-s2-history`.

## Current migration DAG (verified via `alembic heads`/`alembic history`)

```text
0001_canonical_state
  -> 0002_source_and_permission_integrity
  -> 0003_geo_aoi
  -> 0004_geometry_method_repository_derived
  -> 0005_eo_pipeline
  -> 0006_eo_job_leasing
  -> 0007_eo_job_reliability
  -> 0008_spatial_read_indexes
  -> 0009_eo_job_provider_collection (head)
```

Single head, fully linear. Verified live: `alembic heads` returns exactly
one revision.

## History of the conflict (both sides now resolved to the same real state)

`0009_eo_job_provider_collection` (this branch's fix for
`processing.eo_job` never storing which provider/collection a job targets)
was authored while `0008_spatial_read_indexes` (a concurrent session's
migration, for `evidence.source`/`evidence.evidence_item`/
`geo.geometry_observation` spatial-ingestion indexes) was still
**uncommitted**. Two independent resolutions were attempted:

1. On this branch: `0009` was chained directly onto `0008` (`down_revision
   = "0008_spatial_read_indexes"`), reasoning that both files coexist in the
   same `versions/` directory regardless of git status, and Alembic builds
   one DAG from every file on disk -- leaving `0009` parented to `0007`
   instead produced two heads and broke `command.upgrade(config, "head")`
   for every integration test in this working tree (confirmed: 61
   fixture-setup errors reproduced and fixed).
2. On `feature/eo-calibration-multisensor-v0-1` (a separate, since-diverged
   branch): `0009` was instead re-parented to `0007` (kept as a sibling of
   `0008`), on the reasoning that a request-identity migration should not
   have a false *domain* dependency on spatial-index migration, deferring to
   a future explicit Alembic merge revision once `0008`'s real state was
   known.

**Both were reasonable given what each branch could see at the time.** The
concurrent spatial-ingestion session subsequently committed `0008` directly
onto `feature/uganda-cfr-s2-history` (commit `cbebbe9`) with
`down_revision = "0007_eo_job_reliability"` -- confirmed by reading the
committed file directly, not assumed. This makes resolution (1) the one that
matches the actual, now-published state: `0008` is real and committed, so
`0009` depending on it is a true dependency (on migration order), not a
false one.

## Selected resolution

**Keep `0009` parented to `0008` on this branch**, matching what is actually
committed here. `feature/eo-calibration-multisensor-v0-1`'s `0009` (parented
to `0007`) is a **conflicting committed version of the same revision ID**
with a different `down_revision` -- this is a real merge conflict between
the two branches, not resolved by this document alone, and must be resolved
by whoever integrates both branches into `main`:

- If `feature/uganda-cfr-s2-history` merges first: `0008`->`0009` is already
  correct; `feature/eo-calibration-multisensor-v0-1`'s divergent `0009` must
  be rebased onto the merged result (dropping its own `0009` edit) before it
  can merge.
- If `feature/eo-calibration-multisensor-v0-1` merges first: its `0009`
  (parented to `0007`) creates a second head once `0008` also lands, needing
  an explicit Alembic merge revision (`down_revision =
  ("0008_spatial_read_indexes", "0009_eo_job_provider_collection")`), NOT a
  silent rename.
- Either way: **do not renumber migrations to make filenames sequential**;
  revision IDs and `down_revision` links are authoritative, not filename
  order.
- **Do not rewrite already-published `main` history** -- moot here, since
  neither `0008` nor `0009` is on `main` yet; this reconciliation is
  happening entirely pre-mainline, which is exactly when it is safe to do.

## Merge implications

- No scientific work was lost: `0009`'s actual DDL (two new `eo_job`
  columns) is identical on both branches; only its `down_revision` pointer
  differs.
- Whoever merges both branches must run the full test suite again
  post-merge -- `command.upgrade(config, "head")` is exactly where a
  remaining two-head conflict would surface, and it will fail loudly (not
  silently) if unresolved, per the errors already reproduced this session.
- This document supersedes, for this branch, the equivalent document
  authored on `feature/eo-calibration-multisensor-v0-1` (whose premise --
  that `0008` was still uncommitted -- is now stale relative to the actual
  repository state as of `cbebbe9`).
