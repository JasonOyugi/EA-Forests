# Chapter 6 detailed theory - Projecting the structural model into commercial coordinates

## 1. Why a reduced model is necessary

The structural state contains distributions of trees, logs, processor states,
operator states, and a posterior over unknown parameters. Current commercial
data do not identify all of those objects at regional scale.

A useful product still needs answers about price, scale, cost, and break-even.
The paper therefore introduces a **projection**, not a replacement theory.

The reduced model should be read as

\[
Z_t=\Pi_{\rm red}(\mu_t,\nu_t,\kappa_t,\pi_t),
\]

where `Pi_red` keeps only the coordinates needed for today's commercial
questions.

## 2. Asset-side value envelope

For asset account `i`, the paper defines a value envelope

\[
V_{A,i}=A_i^{ha}\left(S_i\delta_i^{op}
+V_i^{asset}\lambda_i^{loss}\right).
\]

Interpretation:

- `A_i^ha` is managed area;
- `S_i` is annual forestry spend per hectare;
- `delta_i^op` is an information-enabled proportional operating improvement;
- `V_i^asset` is standing asset value per hectare;
- `lambda_i^loss` is avoidable annual loss/risk.

This says information can create value through at least two channels: more
efficient operations and avoided loss. The current revenue model does not claim
to monetize the full envelope. It uses a simpler rate against managed spend.

## 3. Asset monetisation and adoption

Let `C_i^A` be an adoption indicator and define the adopted managed-spend base

\[
B_A=\sum_i C_i^A A_i^{ha}S_i.
\]

Asset revenue is

\[
R_A=m_A B_A.
\]

For one homogeneous segment, the paper uses logistic adoption

\[
a(p)=\frac{1}{1+\exp(\eta_Ap-\alpha_A)}.
\]

If the monetisable base is `B`, revenue is

\[
R(p)=Bp\,a(p).
\]

The log revenue is

\[
\log R(p)=\log B+\log p-\log(1+e^{\eta_Ap-\alpha_A}).
\]

Differentiating twice gives

\[
\frac{d^2}{dp^2}\log R(p)
=-\frac1{p^2}-\eta_A^2a(p)(1-a(p))<0.
\]

Therefore revenue is strictly log-concave and has a unique maximizer for
positive price.

The first-order condition is

\[
\eta_Ap(1-a(p))=1.
\]

Solving yields

\[
p^*=\frac{1+W(e^{\alpha_A-1})}{\eta_A},
\]

where `W` is the principal Lambert W branch.

This result is local to the simplified one-segment model. Mixtures of customer
segments, fixed packages, network effects, or dynamic learning can destroy the
one-dimensional global shape.

## 4. Processor-side monetisation

The structural matching layer outputs matched tonnes `M_j`. If processor `j`
adopts the service and pays `f_j` per matched/visible tonne,

\[
R_S=\sum_j C_j^S f_j M_j.
\]

The important conceptual move is that `M_j` is not all wood inside the region.
It is the quantity that survives compatibility, spatial cost, and capacity
constraints in the structural model.

Today's simpler "commercially visible supply" assumption is therefore an
approximation to an operator that has a precise theoretical meaning.

## 5. Cost structure

The paper uses

\[
C(H,N_A,N_P,n_V,W_D,G_{act})
=F+\sum_{g\in G_{act}}F_g+a_HH^{\beta_H}
+b_AN_A+b_PN_P+c_Vn_V+c_DW_D+\epsilon_C.
\]

Components include:

- common fixed cost `F`;
- geography-specific fixed blocks `F_g`;
- variable coverage cost `a_H H^{beta_H}`;
- account-level service costs;
- verification cost;
- data/compute workload;
- residual cost shock.

This form is intentionally able to separate **fixed-cost dilution** from genuine
sublinear marginal scaling.

## 6. Fixed-cost dilution

If

\[
C(H)=F+aH^\beta,
\]

then local total-cost elasticity is

\[
\frac{d\log C}{d\log H}
=\beta\frac{aH^\beta}{F+aH^\beta}<\beta.
\]

So even if the variable component is nearly linear (`beta` near one), total
cost can appear strongly sublinear at small-to-medium scale because the fixed
cost is being spread over more hectares.

This is a diagnostic result. Three declining average-cost observations do not
identify the variable exponent without stronger structure or more data.

## 7. Operating leverage

Let total recurring revenue be `R_H` and expected recurring cost `C_H`. Define
local elasticities

\[
\beta_R(H)=\frac{d\log E[R_H]}{d\log H},\qquad
\beta_C(H)=\frac{d\log E[C_H]}{d\log H}.
\]

Positive operating leverage requires

\[
\beta_R(H)>\beta_C(H).
\]

Scale alone is not enough. Revenue must grow faster than recurring cost in the
relevant range.

## 8. Break-even frontier

At fixed scale,

\[
m_AB_A+f_SB_S=C,
\]

where `B_S` is the adopted matched-tonnage base.

For fixed bases and nonnegative rates, the set

\[
\{(m_A,f_S):m_AB_A+f_SB_S\ge C\}
\]

is a convex half-space. This makes simple trade-off analysis possible: stronger
asset monetisation can compensate for weaker processor monetisation and vice
versa.

The convexity disappears if the bases themselves respond nonlinearly to price,
network effects, or participation thresholds.

## 9. A risk multiplier

Let `R_H>0` and `C_H>0` be random recurring revenue and cost. For target
probability `tau`, define the revenue multiplier

\[
M_H^\tau=\inf\{k>0:P(kR_H-C_H\ge0)\ge\tau\}.
\]

Because revenue is positive,

\[
M_H^\tau=Q_\tau(C_H/R_H),
\]

where `Q_tau` is the left quantile.

This gives an interpretable stress metric: by what multiplicative factor would
the current revenue distribution need to improve to achieve a desired chance of
nonnegative recurring surplus?

## 10. What this chapter does not establish

The reduced model does not prove that hectares cause profitability, that current
adoption priors are observed demand curves, or that matched supply is known
without error.

It is a compact commercial layer that can be used while the research programme
works backward to replace its coarse inputs with structural estimates.
