# ADR 0005: Separate claims, measurements and inference

Status: accepted; Canonical State v0.1.

Entities own identity, not mutable biological/market truth. Assertions represent
source claims; observations represent protocol/method-based measurements; snapshots
represent model-selected or inferred state. Reported values do not become measured
truth through import. Variables have explicit type, canonical unit and domain.
Missingness is a separate value state; zero is a valid numerical value.

Synthetic and scenario facts remain distinct and are rejected by production rules.
The selection model is deterministic recency selection, not Bayesian updating.

Consequence: a current value needs a state/read-model query. Source contradictions
are retained and must be adjudicated by a selection/inference policy, not a database
uniqueness constraint that discards disagreement.
