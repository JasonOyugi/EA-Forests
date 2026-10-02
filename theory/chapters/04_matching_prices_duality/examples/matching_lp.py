"""Toy capacitated partial-transport LP.

Synthetic values only. The script minimizes negative surplus with SciPy's
linprog. Reported shadow values are translated back to the original
maximization interpretation.
"""

from dataclasses import dataclass

import numpy as np
from scipy.optimize import linprog


@dataclass(frozen=True)
class Edge:
    log_type: str
    processor: str
    operator: str
    surplus: float


def main():
    supply = {"small": 60.0, "medium": 70.0, "large": 45.0}
    demand = {"panel": 80.0, "sawmill": 90.0}
    capacity = {"manual": 75.0, "mechanized": 85.0}

    edges = [
        Edge("small", "panel", "manual", 9.0),
        Edge("small", "panel", "mechanized", 13.0),
        Edge("medium", "panel", "manual", 18.0),
        Edge("medium", "panel", "mechanized", 22.0),
        Edge("medium", "sawmill", "manual", 24.0),
        Edge("medium", "sawmill", "mechanized", 28.0),
        Edge("large", "sawmill", "manual", 36.0),
        Edge("large", "sawmill", "mechanized", 40.0),
    ]

    n = len(edges)
    c = -np.array([e.surplus for e in edges])

    rows = []
    rhs = []
    labels = []

    for log_type, amount in supply.items():
        rows.append([1.0 if e.log_type == log_type else 0.0 for e in edges])
        rhs.append(amount)
        labels.append(("supply", log_type))

    for processor, amount in demand.items():
        rows.append([1.0 if e.processor == processor else 0.0 for e in edges])
        rhs.append(amount)
        labels.append(("demand", processor))

    for operator, amount in capacity.items():
        rows.append([1.0 if e.operator == operator else 0.0 for e in edges])
        rhs.append(amount)
        labels.append(("capacity", operator))

    result = linprog(
        c,
        A_ub=np.asarray(rows),
        b_ub=np.asarray(rhs),
        bounds=[(0, None)] * n,
        method="highs",
    )
    if not result.success:
        raise RuntimeError(result.message)

    print(f"Optimal matched surplus: {-result.fun:.2f}")
    print("\nPositive flows:")
    for edge, flow in zip(edges, result.x):
        if flow > 1e-8:
            print(
                f"  {edge.log_type:6s} -> {edge.processor:7s} via "
                f"{edge.operator:10s}: {flow:6.1f} t at {edge.surplus:4.1f}/t"
            )

    # For min c'x with A x <= b, SciPy returns d(min value)/db <= 0 for
    # binding resource upper bounds. Negate to express marginal value of extra
    # resource in the original max-surplus problem.
    print("\nApproximate marginal values of one extra resource unit:")
    marginals = -np.asarray(result.ineqlin.marginals)
    residuals = np.asarray(result.ineqlin.residual)
    for label, marginal, slack in zip(labels, marginals, residuals):
        print(f"  {label[0]:8s} {label[1]:10s}: value={marginal:6.2f}, slack={slack:6.2f}")


if __name__ == "__main__":
    main()
