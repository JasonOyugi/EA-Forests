# ADR 0009: Relational ontology with bounded JSONB

Status: accepted; Canonical State v0.1.

Use relational columns/tables for identity, relationships, taxonomy, units, variables,
provenance, typed quantities, times, worlds and lineage. Use JSONB for raw records,
locators, metadata, model configuration/diagnostics, summary distributions and
experimental attributes. Large posterior samples belong in artifacts, not one row
per particle. Parquet is appropriate when tabular analytical outputs are introduced.

Generic assertions/observations are constrained by a variable registry, exactly-one
typed-value semantics and unit/domain validation. Forestry and market relationships
have explicit tables instead of being embedded in entity metadata. Unknown source
fields stay recoverable without implying they have been canonicalised.

Consequence: a new important domain relationship requires a migration. Flexible
metadata cannot bypass the type/unit or production-world rules.
