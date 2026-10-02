# Source ledger and provenance

This companion was assembled from two primary sources supplied or referenced by
the project owner.

## Primary source 1 - Mathematical working paper

`paper/working-paper.pdf`

Title: *Measure-Valued Stochastic Control and Matching in Spatial Forestry
Markets: McKean-Vlasov Growth, Unbalanced Transport, Bayesian Learning, and
Risk-Sensitive Regime Switching*.

The chapter order, notation, propositions, East African calibration values, and
bibliography in this companion are derived from that working paper. The plain
text extraction is retained as `paper/working-paper.txt` for repository search.

## Primary source 2 - Red-team critique discussion

The companion also incorporates conceptual decisions made during the September
2026 critique of the paper, especially:

- retain age explicitly;
- clarify the geographic role of `D`;
- distinguish `X_t^{i,N}` and `mu_t^N` from the unlabelled limiting measure;
- treat tree identity as a data-association concern unless identity is itself a
  state variable of scientific interest;
- treat density-only competition as a special case of a law-dependent
  interaction;
- separate process diffusion, common noise, idiosyncratic noise, and
  measurement error;
- preserve mass-changing selection effects instead of allowing diffusion to
  stand in for mortality/harvest;
- use the repository companion for slower pedagogy while keeping the paper
  concise and math-first.

These decisions are consolidated in `RED_TEAM_DECISIONS.md`.

## Current repository inspection

The current EA Forests repository was inspected only to understand where the
research folder should sit relative to existing product documentation. The
working paper itself is not currently implemented as a full stochastic-control
system in production code.

## New material in this companion

The following are pedagogical additions rather than new empirical results:

- explanatory derivations in `theory.md` files;
- toy mathematical exercises;
- synthetic numerical examples;
- proposed open problems and research sequencing.

Each numerical example states whether its numbers are synthetic or taken from
the working paper. No new empirical calibration is introduced here.
