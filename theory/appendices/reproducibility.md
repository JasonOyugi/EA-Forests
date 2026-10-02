# Reproducibility and data provenance

The working paper states that its numerical tables are generated from the
canonical EA Forests analytical notebook and related scale-reference,
stress-test, and frontier outputs. Asset structure is calculated from the Uganda
CFR register, while aggregate processor and sector statistics come from internal
2025-2026 intelligence sources.

For a public research implementation, keep the following layers distinct:

## Publicly reproducible theory

- state spaces and assumptions;
- mathematical propositions/proofs;
- synthetic toy examples;
- solver code that does not require restricted data.

## Reproducible calibration with de-identified data

Where possible, publish a calibration dataset sufficient to reproduce aggregate
results without exposing restricted commercial records.

## Restricted empirical evidence

If processor, asset, or contract data cannot be published, mark the case-study
inputs as restricted and keep the theoretical claims independent of them.

## Minimum run metadata

Every numerical result intended for the paper or product should record:

- Git commit;
- input-data version/provenance;
- parameter/prior version;
- random seed or seed policy;
- scenario/particle count;
- solver and tolerance;
- generated output artifact path;
- whether the result is synthetic, prior-predictive, posterior-predictive, or
  based on observed transactions.

This avoids collapsing model uncertainty, numerical error, and provenance into
one opaque result.
