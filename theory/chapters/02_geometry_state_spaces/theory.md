# Chapter 2 detailed theory - Geometry of the forestry state

## 1. The marked tree space

Let `(D,d_D)` be a compact geographic metric space. In this notation `D` is a
geographic domain, not diameter. A model instance may take `D` to be a region,
country, estate, or bounded study landscape. A particular forest is represented
by where the standing-tree measure has support inside `D`.

Let:

- `G` be a finite species/genetic-class set;
- `Q_T` be a compact tree-quality space;
- `Q_L` be a compact log-quality space;
- `M` be a compact management-state space.

To preserve positivity of diameter and height, the paper writes size in
log-coordinates `s=(s_d,s_h)=(log d, log h)`. A tree state is

\[
\xi=(\ell,a,s,g,q,m)\in
E_T=D\times\mathbb R_+\times\mathbb R^2\times G\times Q_T\times M.
\]

Age remains explicit. This is a red-team decision, not an accidental leftover.
Two trees can have similar diameter and height but different age, growth
potential, mortality risk, or management timing. If a future reduced model
shows that age can safely be omitted, that is an empirical model reduction.

## 2. The log, processor, and operator spaces

A harvested log is represented as

\[
\lambda=(\ell,d_s,d_l,L_L,g,q_L,w)\in E_L,
\]

where `d_s` and `d_l` are small- and large-end diameters, `L_L` is length, `q_L`
is quality, and `w` is moisture or another density-relevant state.

Log mass is

\[
m_L(\lambda)=\varrho(g,q_L,w)V_L(d_s,d_l,L_L,q_L).
\]

This is important: the model does not use one universal cubic-metre-to-tonne
constant. Density and recoverable volume are allowed to depend on state.

A processor state records location, normalized desired procurement flow,
specification parameters, utilization, and a sourcing-radius parameter. An
operator state records location, capacity, productivity, equipment/fuel
intensity, cost, and compliance/quality information.

These state spaces are assumed Polish. That gives the measurable and topological
structure needed for probability measures, weak convergence, selection theorems,
and dynamic programming.

## 3. Why discrete biological marks are stratified

Species or genetic class should not be silently embedded as a real number. If
`g=1` and `g=2` are species labels, interpolation through `g=1.5` has no
biological meaning.

The paper therefore identifies the tree space with a finite disjoint union of
continuous strata:

\[
E_T=\bigsqcup_{g\in G}E_T^g.
\]

A standing-tree measure can be written as a vector

\[
\mu=(\mu^g)_{g\in G}.
\]

Continuous growth occurs within a biological stratum. A species change or
reclassification, if scientifically meaningful, must be represented by an
explicit discrete kernel rather than by geometric transport through a fake
continuous species axis.

## 4. Finite measure versus normalized probability law

The persistent tree state is

\[
\mu_t\in\mathcal M_+(E_T).
\]

Its total mass `mu_t(E_T)` matters. Harvest and mortality remove mass;
recruitment adds mass.

When total mass is positive, define the normalized law

\[
\bar\mu_t=\frac{\mu_t}{\mu_t(E_T)}.
\]

These two objects answer different questions:

- `mu_t` says both **how much** tree mass/count is present and **how it is
  distributed**;
- `bar_mu_t` says **what the composition looks like conditional on being in the
  population**.

Normalizing too early destroys information. A plantation with 100 surviving
trees and one with 1,000 surviving trees can have the same normalized size
composition.

## 5. Wasserstein geometry

For probability measures with finite second moment, the quadratic Wasserstein
distance is

\[
W_2^2(\mu,\nu)=\inf_{\gamma\in\Pi(\mu,\nu)}
\int d(x,y)^2\,\gamma(dx,dy).
\]

It asks for the least quadratic cost of transporting one probability law into
another. This makes it natural for growth in continuous state coordinates: mass
moves from smaller to larger sizes, or through quality space, while the total
probability remains one.

The formal tangent geometry gives the continuity equation

\[
\partial_t\mu_t+\nabla\cdot(v_t\mu_t)=0.
\]

That equation conserves total mass, so it is not enough for the full forestry
state.

## 6. Hellinger-Kantorovich / unbalanced transport geometry

A mass-changing continuity equation has the form

\[
\partial_t\mu_t+\nabla\cdot(v_t\mu_t)
=\alpha_t\mu_t+B_t,
\]

where `alpha_t` is a signed reaction rate and `B_t` is an external source
measure. Mortality or harvest corresponds to negative reaction; planting or
recruitment is a source.

Hellinger-Kantorovich geometry is designed for exactly this combination of
transport and reaction. It can compare finite measures with different total
mass.

The conceptual split is therefore:

```text
Wasserstein:     composition of a normalized surviving population
HK/unbalanced:   physical state when mass can appear or disappear
```

The two geometries should not be conflated.

## 7. A useful normalized-selection identity

A key red-team point is that diffusion does not replace selection. Consider a
simplified finite measure satisfying

\[
\frac{d}{dt}\langle\phi,\mu_t\rangle
=\langle L\phi,\mu_t\rangle-\langle\lambda\phi,\mu_t\rangle,
\]

with state-dependent removal hazard `lambda`. Let `M_t=mu_t(E)` and
`bar_mu_t=mu_t/M_t`. Differentiating the normalized expectation gives

\[
\frac{d}{dt}\langle\phi,\bar\mu_t\rangle
=\langle L\phi,\bar\mu_t\rangle
-\operatorname{Cov}_{\bar\mu_t}(\phi,\lambda).
\]

The covariance term is a selection effect: if large trees are harvested at a
higher rate, the composition of survivors changes even without any biological
shrinkage. Recruitment adds further composition terms.

This is why a representative-survivor probability law and a finite-mass state
are related but not interchangeable.

## 8. Linear convexity versus geodesic convexity

`M_+(E)` is a convex cone under ordinary mixtures

\[
(1-\theta)\mu_0+\theta\mu_1.
\]

This is **linear convexity**. It is useful for resource measures and relaxed
controls.

Wasserstein or HK spaces may also have geodesics. A functional can be convex
along those geodesics, which is a different statement. Geodesic convexity is
relevant to transport and gradient-flow methods; linear convexity is relevant to
ordinary convex programs.

The paper deliberately avoids claiming global geodesic convexity because hard
grade thresholds, species labels, regime switches, and impulses break the
smooth continuous structure.

## 9. Finite particle approximation and tree identity

A finite interacting system can be written

\[
X_t^{i,N},\quad i=1,\ldots,N,
\]

with empirical law

\[
\mu_t^N=\frac1N\sum_{i=1}^N\delta_{X_t^{i,N}}.
\]

Here:

- `N` is the finite approximation/population size;
- `i` distinguishes particles in that finite representation;
- the limiting law `mu_t` is unlabelled.

This has an important implementation consequence. Repeated-tree field data may
use a stable identifier such as `(plot, tree_id)`, but that identifier can remain
in a data registry. It only belongs inside the mathematical state if future
dynamics or payoffs depend on identity itself rather than on the tree's
observable/latent attributes.

## 10. Control topology and relaxed controls

For a compact action space `A`, strict controls are progressively measurable
`A`-valued processes. A useful metric is

\[
\Delta(\alpha,\beta)=\mathbb E\int_0^T d_A(\alpha_t,\beta_t)dt.
\]

If the strict action set is non-convex, a relaxed control replaces an action by
a probability measure on actions, an element of `P(A)`. Because `A` is compact,
`P(A)` is weakly compact and convex.

This is a mathematical existence device. It should not be used to average away
physical categories for which mixtures make no sense.

## 11. Implementation interpretation

The state-space chapter tells an engineer what *not* to flatten:

- keep mass separate from normalized composition;
- keep discrete biological labels discrete;
- preserve the variables needed for processor compatibility;
- keep observational confidence outside physical state unless it is itself a
  controlled physical variable;
- maintain stable tree IDs in a data layer when repeated measurements require
  them.

The next chapter places stochastic dynamics on these spaces and constructs the
map from living trees to harvested logs.
