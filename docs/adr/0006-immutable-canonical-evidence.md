# ADR 0006: Immutable evidence and history

Status: accepted; Canonical State v0.1.

Raw inputs, source registrations, evidence objects, model versions and fact content
are immutable. PostgreSQL triggers reject content updates/deletions. Temporal
knowledge intervals can close once, with an actor/reason audit event. New evidence
or corrections append new records; the original bytes remain content-addressed.

Canonical service transactions make related writes atomic. Hashes and parser
versions support replay. Source IDs/names and aliases are retained; fuzzy matching
may suggest candidates but never silently merge organisations.

Consequence: error correction and source-access classification changes require
deliberate new records. Database owners remain operationally privileged; the
administrative API is not a substitute for database role/backup discipline.
