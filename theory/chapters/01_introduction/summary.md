# Chapter 1 summary - Why forestry markets need a distributional state

The chapter starts from a simple claim: a commercial forest cannot be described
adequately by a single inventory number such as hectares, cubic metres, or
average tree size. The economically relevant state is a distribution of trees,
logs, locations, qualities, processor requirements, and operating capacities.

Three problems are nested inside one another.

1. **State estimation.** Infer what trees and logs are present now and what they
   may become, from incomplete inventory, remote sensing, management records,
   and operational observations.
2. **Matching.** Decide which heterogeneous logs can move to which processors,
   through which operators, at what delivered cost and grade value.
3. **Sequential control.** Decide what to observe, test, contract, expose to the
   market, or scale while growth, recovery, acceptance, cost, and demand remain
   uncertain.

The theory therefore separates four mathematical objects that are often mixed
in simpler forestry models:

- controlled stochastic growth on probability laws;
- finite-mass dynamics for mortality, harvest, and recruitment;
- convex partial transport for log-to-processor allocation; and
- Bayesian control on a posterior over both physical state and unknown
  parameters.

This separation is not decorative. It prevents statements such as "500 ha of
forest" from being treated as equivalent to "500 ha of commercially compatible
supply." The first is a land-area statement. The second requires tree sizes,
quality, timing, log recovery, processor specifications, operator feasibility,
transport costs, and uncertainty.

The chapter also sets the philosophy for the paper: define the structural model
first, then introduce East African calibration later. The numerical case study
is therefore a projection of the theory under current evidence, not the source
of the theory itself.

The next chapter makes the state precise by defining marked tree, log,
processor, and operator spaces and by distinguishing probability-measure
geometry from finite-mass geometry.
