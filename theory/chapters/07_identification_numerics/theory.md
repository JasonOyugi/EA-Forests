# Chapter 7 detailed theory - From a structural model to an identified simulator

## 1. Structural parameters are not one undifferentiated vector

The paper partitions parameters as

\[
\theta=(\theta_G,\theta_B,\theta_M,\theta_C),
\]

where:

- `theta_G` controls growth, mortality, and quality transition;
- `theta_B` controls harvest, taper, bucking, and tree-to-log recovery;
- `theta_M` controls processor acceptance, matching, price response, and
  bargaining;
- `theta_C` controls service, verification, and operating cost.

This decomposition is useful because each block requires different evidence.
A model can be strongly identified in one block and weakly identified in
another.

## 2. Observation model with discrepancy

The paper writes the generic observation equation as

\[
Y=F_{obs}(X,u,\theta)+\delta_{model}+\epsilon.
\]

Here:

- `F_obs` is the structural observation map;
- `delta_model` is model discrepancy;
- `epsilon` is measurement noise.

The distinction matters. Suppose measured DBH growth differs systematically
from model predictions at hot, dry sites. If discrepancy is omitted, a Bayesian
fit may force growth parameters into values that compensate for a missing
mechanism. The posterior can then become precise around the wrong structural
story.

Discrepancy is not a license to make the model unfalsifiable. It should be
regularized and informed by experimental design so that parameter effects and
structural error can be separated where possible.

## 3. Data-to-parameter identification map

The working paper proposes the following hierarchy.

### Tree and plot remeasurement

Repeated DBH, height, survival, and quality/form observations inform
`theta_G`. Repeated individual-tree measurements are especially useful because
increments can be conditioned on prior state. With only two time points, process
diffusion, measurement noise, and latent heterogeneity can be hard to separate.

### Harvest and bucking records

Tree-level pre-harvest measurements linked to recovered log dimensions and grade
outcomes inform `theta_B`. Without these data, a mature-tree log-recovery kernel
should be treated as uncertain rather than inferred from standing volume alone.

### Contractor records

Time, equipment, fuel, payload, distance, labour, and realized productivity
inform the delivered-cost kernel and operator state.

### Processor intake and grading

Observed log dimensions, accepted/rejected status, realized grade, moisture,
quality, and price inform processor grade maps and measurement-error-aware
acceptance.

### Repeated bids and alternative buyers

These help separate technical delivered surplus from bargaining and outside
options.

### Product conversion and renewal

Observed customer adoption, retention, and response to price inform the
reduced-order demand model.

## 4. Identifiability is a property of the experiment

Even a mathematically identifiable parameter can be practically unidentified
under a weak data design. If all observed stands have nearly the same density,
for example, a competition coefficient may be confounded with site
productivity. If all logs are far from a grade boundary, measurement-error scale
in the grade classifier may have little support.

The control framework turns this into an experimental-design problem. A useful
experiment is one that creates variation where competing parameter explanations
make different predictions.

## 5. Particle approximation of the biological law

For a site/mark class, simulate particles

\[
X_t^{1,N},\ldots,X_t^{N,N}
\]

using the same common-noise path and independent idiosyncratic noise. The
empirical law approximates the conditional distribution.

A practical implementation should preserve:

- shared common shock within a site-year realization;
- individual heterogeneity;
- mortality and harvest as mass-changing events;
- weights if particles represent unequal numbers of real trees.

The finite particle system is also the natural place to retain tree labels for
synthetic trajectory diagnostics. The limiting measure remains unlabelled.

## 6. Discretizing log space

After harvest and bucking, the model produces a measure over end diameters,
length, quality, moisture, biological class, and location.

A uniform grid can waste resolution far from processor thresholds and be too
coarse near them. Adaptive binning is preferable where value is discontinuous or
steep.

One useful hierarchy is:

```text
individual tree particles
    -> stochastic bucking/recovery
    -> adaptive log bins
    -> processor-grade nodes
    -> operator-capacity nodes
```

Binning only by tonnes is insufficient if processor value changes sharply with
log dimensions.

## 7. Exact LP as a matching benchmark

The finite discretization of the allocation problem is a linear program. Solve
this exact LP on representative scenarios to establish a reference value and
reference dual potentials.

For larger problems, entropy-regularized transport can trade accuracy for speed.
The approximation should be diagnosed by decreasing the regularization parameter
and comparing:

- primal objective value;
- matched grade quantities;
- dual potentials;
- sensitive edges near compatibility thresholds.

A fast solver is not useful if regularization changes the economic scarcity
signals the outer control problem relies on.

## 8. Dual values as a sensitivity oracle

Suppose an outer decision changes available supply, demand, or capacity
approximately affinely. Because the inner matching value is concave in these
resources, optimal dual variables act as supergradients.

This enables decomposition methods. The outer problem can propose a sensing or
coverage decision; the inner LP returns both value and marginal-value
information; those dual values can generate cuts or local approximations for the
outer search.

## 9. Posterior approximation

The exact joint posterior over physical measures and parameters is intractable
for a large system. Candidate approximations include:

- sequential Monte Carlo over parameter and state particles;
- scenario trees;
- stochastic model-predictive control;
- rollout from a low-dimensional belief embedding;
- fitted value functions on decision-relevant summaries.

The reduction should preserve variables that affect decisions. Useful candidates
from the structural model include:

- local compatible supply by grade and radius;
- matched-demand fractions;
- posterior moments of size and quality;
- high-value dual potentials;
- uncertainty near specification boundaries.

Raw hectares can remain a useful exposure variable, but they should not be the
only belief coordinate merely because they are easy to observe.

## 10. A nested simulation path

For posterior draw `s`:

1. sample structural parameters and a common environmental path;
2. propagate tree particles;
3. simulate mortality and harvest;
4. optimize or sample bucking;
5. convert recovered logs to mass using state-dependent density/volume;
6. construct feasible processor/operator edges;
7. solve matching and retain primal/dual outputs;
8. simulate observations generated by the chosen action;
9. update the posterior;
10. evaluate risk and continuation value.

This is a stochastic program over distributions, not a single scalar Monte Carlo
model.

## 11. Decompose numerical uncertainty

At least five error sources should be tracked separately.

### Biological discretization error

Finite particle number, time step, and state approximation.

### Filter/posterior approximation error

Finite posterior particles, approximate likelihoods, or belief compression.

### Recovery model error

Taper, defect, bucking, and log-quality uncertainty.

### Matching/scenario error

Discretization of log space, entropy regularization, and finite scenario count.

### Structural discrepancy

Real mechanisms missing from the model family.

The last category is not reduced merely by running more Monte Carlo samples.

## 12. Minimum reproducibility standard

A numerical experiment should record:

- code revision;
- parameter source and whether synthetic, empirical, or prior;
- random seed where relevant;
- particle count and time step;
- discretization/bins;
- matching solver and tolerances;
- regularization value if used;
- posterior approximation method;
- output uncertainty by source where feasible.

This is the bridge from mathematical theory to a research-grade implementation.
