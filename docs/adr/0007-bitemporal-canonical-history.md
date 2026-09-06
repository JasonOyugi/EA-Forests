# ADR 0007: Real-world time and knowledge time

Status: accepted; Canonical State v0.1.

Use `timestamptz` bounds and generated half-open `tstzrange` values for meaningful
history. A July 1 price learned on July 18 has different validity and knowledge
boundaries. Unknown source validity stays explicitly unknown; ingestion time is
never fabricated from a vintage string.

Corrections close knowledge once and split real-world intervals when necessary.
Original rows remain unchanged apart from the controlled knowledge closure. A
locked supersession serializes concurrent corrections. Historical selection uses
both bounds. Competing independent sources may overlap.

Consequence: callers must distinguish `as_of` from `known_at`. Trivial identity
joins do not carry four timestamps. Current-state views are conveniences, not
replacements for historical queries.
