# Chapter 9 detailed theory - The research programme implied by the model

## 1. The full structural chain

The model can be summarized as a composition of operators:

\[
\mu_t
\xrightarrow{\mathcal G}
\mu_{t+1}
\xrightarrow{\mathcal H,\mathcal B}
\widetilde\Lambda_t
\xrightarrow{\mathcal M}
\Gamma_t^*
\xrightarrow{\mathcal P}
\text{economic outcomes}
\xrightarrow{\mathcal O}
Y_{t+1}
\xrightarrow{\mathcal F}
\pi_{t+1}.
\]

Interpretation:

- `G`: stochastic growth, mortality, recruitment, and quality transition;
- `H`: harvest selection;
- `B`: bucking/recovery from tree to logs;
- `M`: processor/operator matching;
- `P`: price, surplus, and bargaining layer;
- `O`: observation process;
- `F`: Bayesian filtering/update.

The controller chooses actions that can influence several of these operators at
once.

This operator view is the most reusable part of the theory. Each operator can be
implemented first as a coarse approximation and later replaced by a richer,
identified model while preserving the interfaces around it.

## 2. Why separation creates falsifiability

Suppose a predicted forest-gate price is wrong. A scalar model may provide no
clear diagnosis. The structural model asks where the error entered:

- Was standing size/quality wrong?
- Was tree-to-log recovery wrong?
- Was processor compatibility wrong?
- Was haulage or operator productivity wrong?
- Was the outside option wrong?
- Was bargaining behavior wrong?

Likewise, if an EO-derived biomass estimate is accurate but the commercial
supply prediction is poor, the failure may lie downstream rather than in the EO
layer.

This decomposition turns model error into research questions.

## 3. Mathematical open problems

### 3.1 Joint finite-mass dynamics with common noise

The paper combines a normalized conditional McKean-Vlasov law with a
mass-changing finite measure. A deeper theory could formulate the full
stochastic transport-diffusion-reaction process directly on an HK-like
finite-measure space with common noise, controls, and killing/recruitment.

Questions include existence, stability, propagation of chaos for weighted
particles, and a useful dynamic-programming principle on the resulting space.

### 3.2 Stratified geometry

Species/genetic classes and regimes are discrete, while size, location, and
quality are continuous. The global state is therefore stratified rather than a
single smooth manifold.

An open problem is to characterize optimization and viscosity solutions on this
hybrid geometry without pretending that discrete class changes are continuous
transport.

### 3.3 Measure-valued impulse control

Harvest and regime changes can be impulsive. A rigorous quasi-variational
inequality on a belief space whose physical component contains finite measures
would connect the paper's formal recursion to a stronger analytical theory.

### 3.4 Endogenous bucking and matching

When the bucking value function is taken from downstream matching duals, physical
recovery and market allocation become coupled. Conditions for fixed points,
stability, or decomposable solution methods are natural theoretical questions.

## 4. Statistical open problems

### 4.1 Growth diffusion versus heterogeneity

Repeated-tree data are needed to distinguish process noise, measurement error,
site effects, genetic effects, and latent micro-site variation. The red-team
critique specifically warns against interpreting observed cross-sectional spread
as diffusion without longitudinal support.

### 4.2 Competition identification

The structural model allows a general law-dependent interaction. Which summary
or kernel is identifiable from East African trial and plantation data is an
empirical question.

Candidates include:

- stem density;
- basal area;
- stand-density index;
- size-asymmetric crowding;
- spatial neighbour kernels.

The preferred complexity should be selected by out-of-site predictive
performance and biological interpretability, not by mathematical richness
alone.

### 4.3 Recovery and grade transition

The tree-to-log kernel is a major missing link. It requires pre-harvest tree
state joined to log dimensions, defect, moisture/density, grade, and processor
acceptance.

### 4.4 Observation discrepancy

EO, field plots, management records, and processor intake observe different
functions of the latent state. Cross-sensor reconciliation and structural
model-discrepancy modelling are open statistical tasks.

## 5. Economic and market open problems

### 5.1 Processor demand response

Posted prices are not necessarily marginal willingness to pay. Quantity
response, minimum lots, stockout risk, and production schedules can make demand
state-dependent and non-convex.

### 5.2 Outside options and bargaining

The stylized Nash split is a placeholder until repeated transactions, bids, and
alternative-buyer observations identify a stable bargaining structure.

### 5.3 Network effects and adoption

A two-sided forestry intelligence platform may become more valuable as more
asset owners, processors, and operators participate. That can destroy the simple
one-segment log-concavity result and create multiple equilibria or threshold
behavior.

## 6. Decision-science open problems

### 6.1 Which measurements are worth buying?

The posterior framework allows a direct question: where does one additional
field plot, processor intake measurement, or contractor observation have the
highest expected decision value?

The matching dual suggests a powerful heuristic: prioritize uncertainty in
regions of state space with high marginal supply value and high classification
uncertainty.

### 6.2 When should coverage scale?

Regime switching should depend on posterior evidence and the irreversibility of
scale costs, not on an arbitrary calendar milestone. The practical research task
is to define observable sufficient statistics that make this control rule
tractable.

### 6.3 How much model complexity pays for itself?

A more accurate model is not always a better decision tool if it costs much more
to maintain or requires data that are rarely available. Model selection can be
framed in terms of expected decision improvement net of sensing, compute, and
operating cost.

## 7. A proposed research sequence

A sensible sequence implied by the paper is:

1. establish stable canonical state and provenance contracts;
2. assemble repeated-tree and harvest-linked recovery data;
3. identify growth, mortality, and recovery models with explicit uncertainty;
4. build processor acceptance and delivered-cost observations;
5. benchmark the discrete matching LP and its duals;
6. connect high-value uncertainty to targeted field verification;
7. fit reduced belief coordinates for sequential decisions;
8. test regime-switching rules in retrospective or simulated experiments;
9. only then claim stronger Bayes-adaptive operational performance.

This sequence is not the only possible path, but it keeps evidence ahead of
complexity.

## 8. A theorem/proof agenda

The current working paper contains existence, convexity, continuity, and
structural propositions. A more mature mathematical paper could deepen the
proof programme around:

- convergence of weighted finite-particle approximations under killing and
  recruitment;
- stability of the tree-to-log measure map with respect to perturbations in
  tree state and bucking kernels;
- differentiability or subdifferential structure of matching value with respect
  to supply measures;
- error bounds for entropy-regularized matching duals;
- posterior consistency under designed observation policies;
- conditions under which low-dimensional belief summaries are approximately
  sufficient for the outer control problem.

These should be treated as open until complete assumptions and proofs are
written.

## 9. Product/research boundary

The product should be allowed to use simpler models than the theory whenever the
simplification is explicit and empirically honest.

A production output might use a deterministic yield table today while the
research branch evaluates stochastic size distributions. It might use observed
processor grade tables before a full quantity-response model exists. It might
use scheduled verification rather than solving an exact EVSI problem.

The key standard is traceability:

```text
production approximation
    -> structural operator it approximates
    -> evidence supporting the approximation
    -> known failure modes
    -> path to replacement
```

That traceability is what makes the theory useful to EA Forests rather than an
isolated mathematical paper.
