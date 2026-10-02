# EA Forests Mathematical Theory Companion

This directory is a repository-ready companion to the working paper
`Measure-Valued Stochastic Control and Matching in Spatial Forestry Markets`.
It is designed to make the theory inspectable, teachable, and executable without
forcing the main paper to carry every derivation or example.

The main paper remains the compact statement of the model. The material here has
three jobs:

1. explain each chapter in a short summary;
2. expand the mathematical ideas in a self-contained way; and
3. provide toy problems or numerical examples that make the operators concrete.

Nothing in the examples should be read as empirical validation. Numerical files
use synthetic or working-paper parameters unless a file explicitly says
otherwise. The East African numbers in Chapter 8 are the paper's
prior-predictive calibration and retain the same caveats as the paper.

## Directory structure

```text
research/theory/
  README.md
  PAPER_TO_REPO_MAP.md
  RED_TEAM_DECISIONS.md
  NOTATION.md
  REFERENCES.md
  CHAPTER_TEMPLATE.md
  requirements.txt
  paper/
    working-paper.pdf
    working-paper.txt
  chapters/
    01_introduction/
    02_geometry_state_spaces/
    03_growth_harvest_bucking/
    04_matching_prices_duality/
    05_partial_observation_control/
    06_reduced_order_projection/
    07_identification_numerics/
    08_east_african_calibration/
    09_conclusion_open_problems/
```

Each chapter contains:

- `summary.md`: at most about one printed page;
- `theory.md`: a slower, self-contained derivation and interpretation;
- `examples/`: pure-math exercises, toy models, or executable numerical examples.

## Reading order

For a first pass, read the chapter summaries in order. For implementation or
research work, read the detailed theory and then run the corresponding examples.
The most important structural chain is

```text
standing trees -> growth and mortality -> harvest and bucking -> log measure
-> processor/operator compatibility -> allocation and dual values
-> observations and posterior learning -> sequential decisions
```

The reduced-order commercial model appears only after this structural chain is
specified. That ordering is deliberate: hectares, average tonnes, and scalar
prices are projections of a richer state, not primitive truths.

## Red-team principles carried into this companion

Several questions raised during the paper critique are treated explicitly here:

- Age is retained as a state variable with `da_t = dt`; it is not silently
  absorbed into size.
- `D` denotes a compact geographic metric space, not tree diameter. A forest,
  estate, or regional study area is represented by the support of the measure
  inside that geography.
- The superscript `N` denotes a finite particle/population approximation. It is
  not an identity field in the limiting measure.
- Individual-tree identity is a data-association issue. The limiting measure is
  intentionally unlabelled; operational tree IDs can live in a registry or in
  the finite particle representation when repeated-tree tracking matters.
- Competition need not be scalar population density. Density-only competition
  is a special case of a richer law-dependent interaction functional.
- Diffusion describes process heterogeneity or unresolved dynamics only when the
  data can support that interpretation. Measurement noise must remain separate.
- Common and idiosyncratic noise are distinct: shared site-year shocks should
  not be independently resampled tree by tree.
- The paper's concise exposition is not a license to hide assumptions. The
  companion expands assumptions, boundary cases, and proof obligations.

See `RED_TEAM_DECISIONS.md` for the full audit.

## Relationship to the product repository

The current EA Forests codebase implements applied forestry and market models,
not the full stochastic-control research system. The natural bridge is:

```text
research/theory/                           formal structure
        |
        v
docs/architecture/canonical-state-v0.1.md state/data contracts
        |
        v
docs/architecture/eo-observation-architecture.md observation layer
        |
        v
docs/analytics/processor-to-forest-price-bridge.md applied price bridge
        |
        v
backend + frontend models                  production approximations
```

The theory folder should therefore be versioned as research material without
pretending that every operator is already implemented in production.

## Running numerical examples

From `research/theory/`:

```bash
python -m venv .venv
source .venv/bin/activate
pip install -r requirements.txt
```

Then run any example directly, for example:

```bash
python chapters/03_growth_harvest_bucking/examples/mckean_vlasov_growth.py
python chapters/04_matching_prices_duality/examples/matching_lp.py
python chapters/05_partial_observation_control/examples/bayesian_learning.py
```

Each script prints a small numerical result and, where useful, writes a figure
next to the script. Generated figures are not required to be committed.

## Status labels used in these notes

- **Paper result**: stated or proved in the working paper.
- **Pedagogical derivation**: an explanatory derivation of the same model.
- **Toy result**: true for the deliberately simplified example only.
- **Open problem**: not established by the current paper.

This separation is important. The companion should make the theory easier to
understand without manufacturing stronger claims than the paper supports.
