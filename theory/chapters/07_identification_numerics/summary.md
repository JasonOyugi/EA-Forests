# Chapter 7 summary - Identification and numerical approximation

This chapter asks what data are needed to turn the structural theory into an
identified and computable model.

The unknown parameter vector is divided into four blocks: growth/quality,
harvest and bucking, market/matching, and service/verification cost. Different
observations identify different blocks. Tree remeasurement informs growth and
mortality; harvest and bucking records inform tree-to-log recovery; contractor
records inform productivity and delivered cost; processor intake informs grade
acceptance and realized schedules; repeated bids and alternative buyers inform
bargaining; platform conversion and renewal inform adoption and willingness to
pay.

The observation model includes a structural discrepancy term as well as
measurement noise. This is important because forcing all model-data mismatch
into parameter uncertainty can create false posterior precision.

A faithful numerical experiment is nested. For each posterior draw, the model
propagates a tree population under common and idiosyncratic shocks, applies
mortality/harvest, solves or samples bucking, constructs a log measure, builds a
sparse compatibility graph, solves the allocation problem, generates new
observations, updates the posterior, and evaluates continuation value or regime
changes.

The chapter recommends particle approximations for the biological law, adaptive
log bins near processor thresholds, exact linear programming as a benchmark for
matching, and entropy-regularized transport for scale. Dual values can supply
sensitivities to outer optimization.

The main warning is about numerical uncertainty. Particle error, filter error,
bucking error, transport regularization, scenario error, and structural model
discrepancy are different objects. A single Monte Carlo interval that mixes them
all can hide where more data or more computation would actually help.

The current numerical calibration is therefore described as prior-predictive,
not fully calibrated. The next chapter documents that East African projection
and its limitations.
