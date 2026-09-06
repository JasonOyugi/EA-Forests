# ADR 0008: Rebuildable derived state with explicit worlds

Status: accepted; Canonical State v0.1.

Posteriors and state snapshots identify their source observations/assertions,
generating model version/run, configuration and world. Model versions archive actual
code and hash in addition to git SHA. Runs preserve RNG seeds and complete inputs.
Database foreign keys/triggers reject mismatched versions/worlds and missing lineage.

Derived leaf bundles can be removed and rebuilt from durable runs and manifests.
Evidence and original run inputs survive. Decisions and downstream results pin their
referenced snapshots, so leaf deletion refuses to break historical decisions.
Model discrepancy and measurement noise are separate configurations.

Consequence: rebuilding old code under a changed implementation is rejected. Real
historical execution requires that archived version and its recorded environment.
Worlds do not implicitly inherit/copy evidence. Synthetic import quarantine is an
experiment world; the default production world excludes synthetic inputs.
