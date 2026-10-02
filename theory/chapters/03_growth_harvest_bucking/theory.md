# Chapter 3 detailed theory - From living trees to commercial log supply

## 1. Conditional McKean-Vlasov growth

Fix a biological mark class such as site, genetics, and management condition.
For a representative surviving tree, let

\[
\Xi_t=(s_{d,t},s_{h,t},q_t),
\]

where `s_d=log d`, `s_h=log h`, and `q_t` contains continuous quality/form
states. Age follows

\[
da_t=dt.
\]

The paper uses the conditional McKean-Vlasov SDE

\[
d\Xi_t=b_G(\Xi_t,\hat\mu_t,a_t,\varsigma,a_t^G)dt
+\sigma_G(\cdot)dB_t
+\sigma_G^0(\cdot)dW_t^0,
\]

with conditional law

\[
\hat\mu_t=\mathcal L(\Xi_t\mid\mathcal F_t^0).
\]

`W^0` is common noise and `B` is idiosyncratic noise. Conditional on the common
noise, the population law remains random but the common environmental path is
shared.

This distinction matters in simulation. If a drought shock is intended to be a
site-year event, independently drawing a new drought shock for every tree would
artificially remove within-site correlation.

## 2. What the law dependence is doing

A McKean-Vlasov model allows the drift or diffusion of a focal tree to depend on
the population distribution. A generic competition term is

\[
\mathcal C(x,\mu)=\int K_{\rm comp}(x,x')\,\mu(dx').
\]

This formulation contains several special cases.

### Scalar density

If `K_comp(x,x')=c` is constant, competition depends only on total mass or
population density. This can be useful but is biologically coarse.

### Size-weighted mean field

If

\[
K_{\rm comp}(x,x')=c\,D(x')^2,
\]

then competition is proportional to a basal-area-like moment of the stand.

### Local spatial competition

If tree location is available,

\[
K_{\rm comp}(x,x')=w(\|\ell-\ell'\|)g(D(x),D(x')),
\]

can represent distance-decaying and size-asymmetric competition.

The red-team conclusion is not that one form is universally correct. It is that
**density-only competition should be described as a special case**, while the
structural model retains enough law dependence to support richer forms when the
data justify them.

## 3. Why log-size coordinates are useful

Writing diameter and height in logarithmic coordinates gives positivity after
exponentiation and allows additive Gaussian perturbations without creating
negative physical sizes.

If `Y_t=log D_t` follows

\[
dY_t=\mu_Y(Y_t,\cdots)dt+\sigma_Y(Y_t,\cdots)dW_t,
\]

then Itô's formula gives the corresponding diameter dynamics

\[
dD_t=D_t\left(\mu_Y+\frac12\sigma_Y^2\right)dt
+D_t\sigma_YdW_t.
\]

Thus even simple additive log-space noise becomes multiplicative noise in
physical diameter.

This is a modelling convenience, not a claim that Gaussian diffusion is the
true biological mechanism.

## 4. What diffusion should and should not mean

The paper deliberately leaves the biological parametrization open. The same
market layer could be driven by a deterministic increment model, a learned
transition density, a jump process, or a size-structured PDE.

When diffusion is used, separate at least three uncertainty sources:

1. **process heterogeneity** - unobserved micro-site or biological variation;
2. **common environmental shock** - climate or disturbance shared across trees;
3. **measurement error** - error in observing DBH, height, or quality.

Only the first two belong in the state process. Measurement error belongs in the
observation kernel.

With sparse remeasurement, a complex state-dependent diffusion can be weakly
identified. The companion examples therefore use simple noise and should not be
read as calibration recommendations.

## 5. Well-posedness

Under standard Lipschitz dependence on state and conditional law in `W_2`,
linear growth bounds, and continuity in the control, the conditional
McKean-Vlasov SDE admits a unique strong solution on a finite horizon and its
conditional law remains in `P_2`.

The key mathematical requirement is that small changes in state or population
law do not create arbitrarily large jumps in coefficients:

\[
\|b(x,\mu)-b(x',\mu')\|
+\|\sigma(x,\mu)-\sigma(x',\mu')\|
\le L(\|x-x'\|+W_2(\mu,\mu')).
\]

This proposition is a well-posedness statement, not an empirical claim that a
particular growth law has been identified.

## 6. Finite-mass dynamics

The normalized conditional law does not track how many trees remain. Introduce
harvest hazard `lambda_t^H(xi;u_t)`, mortality hazard `lambda_t^M(xi)`, and a
recruitment/planting-rate measure `B_t`.

For a smooth test function `phi`, the finite measure evolves weakly as

\[
d\langle\phi,\mu_t\rangle
=\left[\langle L_t\phi,\mu_t\rangle
-\langle(\lambda_t^H+\lambda_t^M)\phi,\mu_t\rangle
+\langle\phi,B_t\rangle\right]dt
+\text{common-noise term}.
\]

This is a transport-diffusion-reaction equation. Growth moves state; mortality
and harvest remove mass; recruitment adds mass.

## 7. Harvest as a flow into log space

Let `K_B(dlambda | xi,beta_t^B)` be a bucking kernel. Conditional on a harvested
Tree state `xi` and bucking rule `beta_t^B`, it returns a finite measure of logs.

Over a short decision interval, the expected log-count intensity is

\[
\Lambda_t(A)=\int_{E_T}
\lambda_t^H(\xi;u_t)K_B(A\mid\xi,\beta_t^B)\mu_t(d\xi).
\]

This formula is the core tree-to-log map.

It says that log supply depends jointly on:

- which trees exist;
- which trees are harvested;
- how each tree is cut;
- the uncertainty encoded in the bucking/recovery kernel.

The tonne-weighted measure is

\[
\widetilde\Lambda_t(d\lambda)=m_L(\lambda)\Lambda_t(d\lambda).
\]

Again, no universal volume-to-mass coefficient is required.

## 8. Bucking as a control problem

Let `A_B(xi)` be the feasible set of cutting patterns. Given a downstream
log-value function `v_t^L(lambda)` and bucking cost `c_B`, define

\[
J_B(\xi,\beta;v_t^L)
=\int v_t^L(\lambda)K_B(d\lambda\mid\xi,\beta)-c_B(\xi,\beta).
\]

An optimal pattern satisfies

\[
\beta_t^{B,*}(\xi)\in\arg\max_{\beta\in A_B(\xi)}J_B(\xi,\beta;v_t^L).
\]

This creates a feedback from the market layer into physical recovery. If long,
high-grade logs are scarce and carry high downstream shadow value, the preferred
cut can differ from the cut that maximizes volume alone.

Under measurable-graph, compactness, measurability, and upper-semicontinuity
assumptions, a measurable maximizing selector exists.

## 9. A simple competition example

Suppose log-DBH `Y_i` follows

\[
dY_i=\left[r(1-e^{Y_i}/D_{\max})
-\gamma\,G(\mu_t)\right]dt+\sigma dB_i+\sigma_0dW^0,
\]

where

\[
G(\mu_t)=\int e^{2y}\,\mu_t(dy)
\]

is a basal-area-like moment.

This is a mean-field model: each tree feels a competition pressure generated by
the whole size distribution, not merely the number of stems. A stand with the
same stem density but many large competitors produces a larger `G(mu)`.

The example is deliberately stylized. Its purpose is to show how a biologically
richer competition variable fits inside the structural framework.

## 10. Main implementation consequence

The structural object that should feed the market model is not "volume per
hectare". It is a distribution of recoverable logs, ideally with uncertainty.
A current implementation may approximate that distribution with size classes,
yield tables, or grade shares, but the mathematical destination is explicit.
