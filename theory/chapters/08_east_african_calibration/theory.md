# Chapter 8 detailed theory - Reading the calibration without overclaiming it

## 1. Calibration status

The numerical section of the working paper is explicitly described as a
**prior-predictive calibration**. That phrase should be preserved in every reuse
of the results.

A prior-predictive calculation answers:

> If the current evidence-informed assumptions and uncertainty distributions are
> approximately right, what range of commercial outcomes do they imply?

It does not answer:

> Has the full structural model been identified and validated against observed
> outcomes?

The distinction is central because the structural tree/log/matching layer is not
yet identified region-wide.

## 2. Evidence used as scale anchors

The working paper reports approximately:

- 338,555 planted hectares in Uganda;
- 588,000 planted hectares in Tanzania;
- about 0.93 million hectares combined;
- 37 Chinese-owned processors in the internal intelligence base;
- about 5 million m3/year installed capacity;
- about 3 million m3/year current use;
- typical utilisation around 50-60%.

These are internal 2025-2026 evidence inputs cited by the paper. This companion
does not independently verify or update them. They should not be presented as
October 2026 public statistics merely because this repository is being updated
later.

The paper also uses a Uganda CFR register with about 94,820 recorded planted
hectares across 3,294 positive planted portfolios. The reported planted-area
Gini is approximately 0.803. This concentration is why account count cannot be
inferred from hectares using a single average estate size.

## 3. Missing structural state

The paper states that the current calibration does not contain a region-wide
joint tree-level size-quality distribution. It therefore cannot yet estimate the
full mapping

\[
\mu_t\to\widetilde\Lambda_t\to\Gamma_t^*
\]

directly from regional data.

Instead, the reduced model uses priors for commercially available flow,
processor coverage, adoption, monetisation, and correlated market state.

This should be read as a placeholder architecture with explicit destinations
for future evidence.

## 4. Prior-predictive scale results

The paper reports 50,000 joint prior-predictive draws. The draw count reduces
Monte Carlo error conditional on the model; it does not validate the priors or
remove structural discrepancy.

Key reported values are:

| Metric | 100k ha | 500k ha | 1m ha |
|---|---:|---:|---:|
| Revenue P20, USDk/yr | 49 | 326 | 650 |
| Revenue P50, USDk/yr | 78 | 451 | 850 |
| Revenue P80, USDk/yr | 115 | 613 | 1,090 |
| Base OPEX P50, USDk/yr | 219 | 424 | 669 |
| Robust OPEX P50, USDk/yr | 350 | 617 | 875 |
| Joint operating surplus P20, USDk/yr | -197 | -125 | -66 |
| Joint operating surplus P50, USDk/yr | -145 | 21 | 171 |
| Joint operating surplus P80, USDk/yr | -97 | 191 | 436 |
| P(operating surplus > 0) | 0.01 | 0.55 | 0.72 |
| Paying-ha penetration | 0.25 | 0.26 | 0.262 |
| Asset fee, USD/paying ha | 2.16 | 2.17 | 2.18 |
| Supply fee, USD/visible t | 0.253 | 0.259 | 0.260 |

These are outputs of the paper's assumed mapping from coverage to commercial
activity. They are not evidence that hectares mechanically cause profitability.

## 5. Cost identification example

The three median base-cost anchors are approximately

\[
(100k,219k),\quad(500k,424k),\quad(1m,669k).
\]

A naive pure power model

\[
C(H)=aH^\beta
\]

fits these points with an apparent exponent near `0.47`.

But the paper gives an exact three-point fit of the form

\[
C(H)=162.8+56.2\left(\frac{H}{100000}\right)^{0.955}
\]

in USD thousands per year.

The variable exponent is then close to one. The low apparent total-cost
elasticity comes largely from spreading the fixed USD 162.8k component.

This is an important model-audit example: a scaling curve can have very
different structural interpretations that agree at the observed anchors.

## 6. Break-even thresholds

Holding the other revenue side fixed at its current median, the working paper
reports one-lever deterministic break-even thresholds.

| Scale | Cost mode | Asset monetisation (% managed spend) | Supply fee (USD/t) | Paying-ha penetration |
|---|---|---:|---:|---:|
| 100k | Base | 2.23 | 2.04 | 90.3% |
| 100k | Robust | 3.73 | 3.70 | 150.9% |
| 500k | Base | 0.56 | 0.21 | 23.5% |
| 500k | Robust | 0.98 | 0.54 | 41.3% |
| 1m | Base | 0.42 | 0.08 | 17.9% |
| 1m | Robust | 0.65 | 0.29 | 27.3% |

A penetration threshold above 100% is a diagnostic that the selected lever
cannot achieve break-even on its own under those assumptions. It should not be
interpreted as a feasible business target.

## 7. Robustness multiplier

For an 80% target probability of nonnegative recurring operating surplus, the
paper reports revenue multipliers of approximately

\[
M_{100k}^{0.8}=4.68,\qquad
M_{500k}^{0.8}=1.37,\qquad
M_{1m}^{0.8}=1.10.
\]

This measures distance from the target under the current joint distributions.
It does not establish that scaling hectares will itself cause those
improvements.

## 8. Adoption priors

The appendix gives size-dependent asset-adoption priors at central price/value
conditions:

| Portfolio size | 1-10 | 10-50 | 50-150 | 150-500 | 500-1,500 | 1,500-5,000 | 5,000+ |
|---|---:|---:|---:|---:|---:|---:|---:|
| Base adoption | 0.1% | 0.5% | 5% | 15% | 35% | 60% | 80% |

The paper explicitly calls these priors rather than measured conversion rates.
Future observed conversion and renewal data should replace them.

## 9. What new evidence would structurally improve the calibration?

The model identifies specific targets:

- repeated tree/plot measurements for growth, mortality, and quality transition;
- harvest-linked tree-to-log records for recovery and bucking;
- operator logs for productivity and delivered cost;
- processor intake for grade acceptance and density conversion;
- repeated bids/alternative buyers for outside options and bargaining;
- observed platform conversion and renewal for willingness to pay.

Each new dataset should update a named operator rather than simply "improve the
model" in an unspecified way.

## 10. Interpretation discipline

The numerical section is valuable precisely because it states what is and is not
identified. The right progression is:

```text
prior-predictive scale experiment
    -> targeted data collection
    -> operator identification
    -> posterior predictive validation
    -> decision experiments
    -> stronger operational claims
```

The calibration is therefore a research instrument as much as a business-case
output.
