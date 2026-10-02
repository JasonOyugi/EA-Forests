# Chapter 1 detailed theory - The object being modelled

## 1. The central modelling problem

A forestry market is not only a biological growth problem and not only a market
clearing problem. It is a coupled system in which biological state determines
what material may exist, harvesting transforms that state into a different
commodity space, processor specifications decide which parts of that commodity
space have value, spatial operators determine delivered cost, and observations
change what the decision maker knows about all of those objects.

A useful mathematical model must therefore preserve heterogeneity long enough
for the economically important compatibility tests to be applied.

Suppose two estates each contain exactly 100 hectares and exactly 20,000 cubic
metres of standing volume. Those scalar totals do not imply equal commercial
value. Estate A could contain mostly logs above a target processor's small-end
diameter threshold and lie 20 km from a mill. Estate B could contain the same
total volume in smaller stems, more defect, and a 250 km transport route. The
state variables that explain the difference have been averaged away by the
scalar summary.

The paper's response is to make the primary state **measure-valued**. A measure
records how much mass or how many objects occupy each region of a state space.
For forestry, that state space can carry location, age, log-diameter and height,
species or genetics, quality, and management condition.

The standing-tree object is written schematically as

\[
\mu_t \in \mathcal M_+(E_T),
\]

where `E_T` is the marked tree space and `M_+(E_T)` is the cone of finite
nonnegative Radon measures on that space.

The total mass `mu_t(E_T)` is meaningful. Depending on the sampling convention,
it can represent an intensity, count, or area-weighted count. This is why the
paper does not normalize everything into a probability distribution.

## 2. Why there are three nested problems

### 2.1 State estimation

The physical state is not fully observed. We may observe plots, remote-sensing
features, harvest records, processor intake, or contractor performance. None is
identical to the latent economic state.

Mathematically, the model therefore needs an observation process and a posterior
state. A map pixel, for example, is evidence about a latent tree distribution;
it is not automatically DBH, log grade, or harvest value.

### 2.2 Matching

Once harvestable material has been represented as a log distribution, economic
usefulness is determined by compatibility. Processor `j` may accept only a
subset `S_j` of log space. Operator `k` may have finite capacity or equipment
constraints. Delivered cost depends on the log, route, and operator.

The matching problem is therefore not simply

\[
\text{revenue} = \text{tonnes} \times \text{average price}.
\]

Instead, it is an allocation problem over feasible triples

\[
(\lambda, j, k),
\]

where `lambda` is a log state, `j` a processor, and `k` an operator.

### 2.3 Sequential control

A decision maker can change both the current physical/economic outcome and the
quality of future information. Choosing an inventory campaign, instrumenting a
contractor, testing a processor's grade response, or exposing a new supply
cluster to the market can reveal parameters that affect later decisions.

This makes the problem a dual-control problem: actions can have both immediate
payoff and learning value.

## 3. The operator chain

The paper is easier to understand when written as a sequence of operators.

### 3.1 Biological evolution

A stochastic evolution operator moves the standing-tree measure through size and
quality space and changes its mass through mortality and recruitment.

### 3.2 Harvest and bucking

A harvest rule removes mass from the standing-tree measure. A bucking kernel
maps each harvested tree state to a finite measure of logs.

Schematically,

\[
\mu_t \longrightarrow \Lambda_t,
\]

where `Lambda_t` is a log measure.

### 3.3 Compatibility and allocation

Processor specifications and operating constraints define which parts of
`Lambda_t` are commercially useful. A partial-transport problem chooses an
allocation measure `Gamma_t`.

\[
\Lambda_t \longrightarrow \Gamma_t.
\]

The allocation need not use all logs, satisfy all demand, or fill all operator
capacity. Partial matching is a feature, not a failure.

### 3.4 Observation and learning

Observations update a posterior over physical state and structural parameters.
That posterior becomes the sufficient state for sequential decisions.

The full conceptual loop is therefore

```text
latent tree state
    -> growth / mortality / recruitment
    -> harvest / bucking
    -> log distribution
    -> processor/operator matching
    -> economic outcomes and observations
    -> posterior update
    -> next decision
```

## 4. What the theory deliberately does not collapse

Several distinctions are essential.

### Biological productivity is not commercial availability

Fast growth does not imply that the recovered logs meet target specifications.

### Commercial availability is not compatibility

A large harvestable log volume may be incompatible with a processor's diameter,
length, species, moisture, or defect constraints.

### Compatibility is not delivered surplus

A compatible log can still be uneconomic if transport and operating costs erase
its value.

### Delivered surplus is not negotiated forest-gate price

The seller's outside option and bargaining environment can affect the realized
price even after technical matching is known.

### Physical coverage is not information value

Mapping more hectares is not automatically valuable. Information is valuable
when it changes a decision or reduces uncertainty in a decision-relevant part of
state space.

## 5. Structural model versus reduced-order model

The structural model is intentionally richer than current data can fully
identify. The paper later introduces a reduced-order commercial projection
based on hectares, paying accounts, matched supply, and operating cost.

The correct logical relationship is

\[
\text{structural state} \xrightarrow{\text{projection}} \text{reduced model},
\]

not the reverse.

This matters because a reduced model can be useful without being mistaken for a
biological law. For example, a scalar "visible tonnes" parameter can be an
operational approximation today while the research programme gradually replaces
it with estimated growth, bucking, and matching operators.

## 6. Why this is a control problem rather than only an estimation problem

If the goal were merely to estimate future tree distributions, a stochastic
filter or forecasting model might be enough. The EA Forests theory instead asks
what a decision maker should *do* while estimates remain uncertain.

The action space can include:

- sensing or field verification;
- designed experiments;
- matching exposure;
- contract or posted-price variables;
- coverage intensity; and
- discrete regime changes.

Thus the state must be defined with the eventual decision problem in mind.
There is little value in estimating a variable accurately if no feasible action
changes as a result. Conversely, a noisy variable near a processor grade
threshold can be highly decision-relevant.

## 7. Red-team interpretation

The critique of earlier drafts pushed the paper toward a strict separation
between **state definition**, **observation**, and **implementation**.

Individual-tree IDs, for example, are useful for repeated measurements but need
not be coordinates of the limiting measure. Likewise, Earth-observation
features belong in an observation model rather than being re-labelled as tree
attributes before calibration.

The companion chapters keep that discipline. Whenever a simplified example
uses a scalar or a discrete approximation, it should be read as a projection of
the structural model, not a claim that the richer state is unnecessary.

## 8. Main takeaway

The fundamental modelling move is to preserve the distribution of economically
relevant states until the biological, technical, and market constraints that
act on that distribution have been applied. This is what makes the subsequent
use of measure-valued dynamics, unbalanced transport, and Bayesian control
coherent rather than a collection of unrelated mathematical techniques.
