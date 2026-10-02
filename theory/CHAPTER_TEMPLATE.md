# Chapter template

Every future theory chapter should contain the same three layers.

## `summary.md`

Maximum target: one printed page.

Include:
- the question the chapter answers;
- the state/decision objects introduced;
- the central mathematical result or modelling move;
- what the chapter does *not* establish;
- one bridge sentence to the next chapter.

## `theory.md`

Aim for a self-contained explanation.

Recommended order:
1. problem statement;
2. domains and variables;
3. assumptions;
4. mathematical construction;
5. propositions/theorems and proof intuition;
6. boundary/special cases;
7. interpretation in forestry;
8. implementation implications;
9. unresolved questions.

Do not silently strengthen the working paper. Mark additional derivations as
pedagogical and additional conjectures as open problems.

## `examples/`

Use at least one of:
- pure-math exercise with a worked answer;
- discrete toy model;
- numerical simulation;
- limiting/special-case calculation;
- counterexample showing why a simplification fails.

Every numerical example must state whether its numbers are synthetic,
working-paper calibration values, or empirical observations.
