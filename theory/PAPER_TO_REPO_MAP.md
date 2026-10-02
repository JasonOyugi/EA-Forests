# Paper-to-repository map

This file maps the working paper to the expanded companion chapters and to the
existing EA Forests implementation surfaces.

| Working paper | Companion folder | Main object | Product-side analogue |
|---|---|---|---|
| 1 Introduction | `01_introduction` | distributional forestry-market problem | landing/model narrative |
| 2 Mathematical setting and geometry | `02_geometry_state_spaces` | marked spaces, finite measures, Wasserstein/HK, controls | canonical state contracts |
| 3 Stochastic tree growth and log-supply map | `03_growth_harvest_bucking` | McKean-Vlasov growth, mortality, harvest, bucking | growth, roundwood and mensuration models |
| 4 Processor specifications, matching, price formation | `04_matching_prices_duality` | grade sets, allocation, dual values, bargaining | market/processor data and price bridge |
| 5 Partial observation and Bayes-adaptive control | `05_partial_observation_control` | posterior state, Bellman equation, risk, learning | observation and validation architecture |
| 6 Coarse finite-dimensional projection | `06_reduced_order_projection` | adoption, revenue, cost, break-even | current commercial viability models |
| 7 Identification and numerical approximation | `07_identification_numerics` | what data identify which operators; solver architecture | analytical notebook and validation pipeline |
| 8 East African numerical calibration | `08_east_african_calibration` | prior-predictive scale experiment | current internal calibration outputs |
| 9 Conclusion | `09_conclusion_open_problems` | research programme and operator separation | roadmap |

## Theoretical object versus implementation

The paper defines a structural target. The application can implement a sequence
of increasingly faithful approximations without claiming the full target is
already solved.

A useful maturity ladder is:

1. **Scalar projection** - hectares, average yield, average prices, fixed costs.
2. **Structured deterministic model** - size/age classes, grades, spatial costs.
3. **Stochastic predictive model** - uncertainty in growth, quality, recovery,
   costs, and observations.
4. **Measure-valued matching model** - heterogeneous log supply matched to
   processor and operator constraints.
5. **Bayes-adaptive controller** - sensing, experiments, contracting, and regime
   changes chosen while uncertainty evolves.

The repository can move up this ladder module by module. The mathematical
companion exists partly to make those substitutions explicit.
