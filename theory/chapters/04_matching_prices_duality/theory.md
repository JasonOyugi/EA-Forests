# Chapter 4 detailed theory - Matching heterogeneous logs to heterogeneous demand

## 1. Processor grade sets

Let processor `j` have grades `r=1,...,n_j^G`. Each grade is a measurable subset
of log state space,

\[
S_{jr}\subset E_L.
\]

A simple grade cell can be written

\[
S_{jr}=\{\lambda:d_s\ge d_{jr}^{\min},\ L_L\ge L_{jr}^{\min},
\ g\in G_{jr},\ q_L\in Q_{jr}\}.
\]

Other constraints can add upper diameter limits, taper, defect, moisture, or
piece-count conditions.

If grade cells overlap, define a grade map that selects the highest-valued
admissible grade. A posted per-tonne schedule is then a measurable function
`p_j^0(lambda)` on log space.

The key modelling point is that price is attached to a **compatible physical
state**, not to undifferentiated tonnes.

## 2. Quantity-sensitive value

A processor may value the first 1,000 tonnes of a grade differently from the
next 1,000. Let

\[
\pi_{jr}^{\rm marg}(m)
\]

be marginal willingness to pay for an additional tonne and define cumulative
value

\[
\Phi_{jr}(m)=\int_0^m\pi_{jr}^{\rm marg}(z)dz.
\]

If marginal willingness to pay is nonincreasing, `Phi_jr` is concave. This
preserves convexity of the continuous allocation layer.

Minimum lots, fixed activation costs, take-or-pay clauses, and increasing block
prices can break that convexity and may require mixed-integer decisions.

## 3. Measurement error near hard thresholds

Suppose a processor requires small-end diameter at least 18 cm. A measured
17.9 cm log is not physically distinguishable from an 18.1 cm log if the
measurement error is, say, 0.5 cm. A deterministic threshold can therefore make
small observation changes create large grade-count changes.

Let

\[
a_{jr}^\eta(\lambda)\in[0,1]
\]

be the probability that log state `lambda` is classified as grade `r` under a
measurement-error model with scale `eta`.

Then expected compatible supply is an integral of a bounded continuous
compatibility function against the log measure. Under narrow convergence of log
measures, these integrals are continuous. This is the mathematical reason for
introducing the smoothed layer: it is both statistically meaningful and
numerically stable.

## 4. Delivered surplus

For log `lambda`, processor `j`, and operator `k`, let

\[
c_t(\lambda,j,k)
\]

collect non-stumpage delivered cost. The paper separates components such as
felling, extraction, loading, haulage, QA, compliance, and risk.

Compatible delivered surplus is

\[
s_t(\lambda,j,k)=p_j^0(\lambda)-c_t(\lambda,j,k).
\]

If the processor or operator is infeasible for that log, the edge is forbidden.

This builds a sparse compatibility hypergraph. The market is not complete: many
log-processor-operator triples should not exist.

## 5. The partial-transport problem

Let `S` be available tonne-weighted log supply, `D` processor demand, and `O`
operator capacity. An allocation is a nonnegative measure `Gamma` on feasible
triples.

The linear problem is

\[
V(S,D,O)=\sup_{\Gamma\ge0}\int s\,d\Gamma
\]

subject to marginal inequalities

\[
\Gamma_L\le S,\qquad \Gamma_J\le D,\qquad \Gamma_K\le O.
\]

The inequalities are important. The optimizer may leave low-value logs
unmatched, leave some processor demand unmet, or leave operator capacity idle.

With finite supply/demand/capacity and suitable closedness and upper
semicontinuity assumptions, the feasible set is convex and narrowly compact and
an optimizer exists.

## 6. Concavity and homogeneity of matching value

For a fixed surplus kernel, the resource-value function is jointly concave:

\[
V(\theta S_1+(1-\theta)S_2,
  \theta D_1+(1-\theta)D_2,
  \theta O_1+(1-\theta)O_2)
\ge
\theta V(S_1,D_1,O_1)+(1-\theta)V(S_2,D_2,O_2).
\]

Why? If `Gamma_1` and `Gamma_2` are feasible for two resource triples, their
convex mixture is feasible for the convex mixture of those resources and earns
the same convex mixture of values.

The linear problem is also positively homogeneous:

\[
V(aS,aD,aO)=aV(S,D,O),\qquad a\ge0.
\]

Scaling all resources together scales the feasible allocation and its value.

## 7. Dual problem and shadow values

The dual is

\[
\inf_{\varphi,\psi,\omega\ge0}
\int\varphi\,dS+\sum_j\psi_jQ_j+\sum_k\omega_kK_k
\]

subject to

\[
\varphi(\lambda)+\psi_j+\omega_k
\ge s(\lambda,j,k)
\]

on every feasible triple.

At differentiable points, the optimal potentials are marginal resource values.
They answer questions such as:

- What is one more tonne of this exact compatible log type worth?
- What is one more tonne of processor demand worth?
- What is one more tonne of operator capacity worth?

This creates an information-value connection. Discovering one additional tonne
in a high-shadow-value region of log space can matter more than discovering many
tonnes that are already abundant or incompatible.

## 8. Entropic/unbalanced regularization

For large discretized problems, the paper introduces an entropy-transport
relaxation with KL penalties. This replaces hard equality-style transport with a
smooth convex objective over finite measures and can be solved with
Sinkhorn-type scaling methods.

Regularization has a cost: the solution is biased relative to the exact linear
program. The numerical programme should therefore solve a subset of scenarios
at decreasing regularization and compare both objective values and dual
potentials.

## 9. Matching output as commercially useful supply

Let `Gamma*` be an optimal allocation. The matched flow into processor `j` is

\[
M_j=\Gamma_J^*(\{j\}),
\]

and its demand coverage ratio is

\[
\chi_j=M_j/Q_j.
\]

This is a structural definition of commercially useful supply. It is a function
of tree/log attributes, location, processor grades, operator capacity, and cost.
It is not the same thing as all standing volume inside a radius.

## 10. Outside options and bargaining

The transport dual tells us the marginal value of resources under the allocation
problem, but a negotiated seller price needs a bargaining model.

Let `o_j(lambda)` be the seller's best credible alternative net value and
`v_j(lambda)` the best net value available with target buyer `j`. A stylized Nash
split with seller bargaining weight `beta` gives

\[
p_j^{FG}=o_j+\beta(v_j-o_j),
\]

when the target buyer creates positive incremental surplus.

The paper extends `v_j` to include grade-specific marginal willingness to pay,
least delivered cost, and a search-risk premium that falls as compatible local
supply becomes easier to source.

This separates four ideas that are often collapsed into one observed price:

1. processor gross value;
2. delivered operating cost;
3. alternative-buyer outside option;
4. bargaining division of surplus.

## 11. A caution about causal interpretation

A high dual value does not prove that a processor will pay that amount to the
seller. It is a marginal value inside the specified allocation model. Likewise,
a bargaining function is not identified merely because observed prices exist.
Repeated bids, alternative buyers, and contract variation are needed to
separate cost, scarcity, and bargaining mechanisms.

## 12. Implementation consequence

A practical approximation can discretize log state into bins, processor grades
into nodes, and operators into capacity nodes. The exact LP becomes a benchmark.
As data improve, bin boundaries can be refined around grade thresholds where a
small state error has large value consequences.
