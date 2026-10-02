"""Tiny end-to-end structural pipeline for pedagogy.

Synthetic only. This is not the production EA Forests model.
"""

import numpy as np
from scipy.optimize import linprog


def grow_trees(rng, n=200, years=5, dt=0.05):
    dbh = rng.lognormal(mean=np.log(9.0), sigma=0.12, size=n)
    for _ in range(int(years / dt)):
        crowding = np.mean(dbh**2)
        common = rng.normal(scale=np.sqrt(dt))
        idio = rng.normal(size=n) * np.sqrt(dt)
        rel_growth = 0.18 * (1 - dbh / 42.0) - 0.00008 * crowding
        dbh *= np.exp(rel_growth * dt + 0.05 * idio + 0.025 * common)
    return dbh


def harvest_and_buck(rng, dbh):
    selected = dbh[dbh >= 16.0]
    logs = []
    for d in selected:
        # Toy recovery: each harvested tree yields 1-3 logs. Small-end diameter
        # falls with log position. Length is fixed to keep the example small.
        pieces = 3 if d >= 26 else (2 if d >= 20 else 1)
        for p in range(pieces):
            sed = max(5.0, d - 2.5 * (p + 1) + rng.normal(0, 0.5))
            logs.append(sed)
    return np.asarray(logs)


def match_logs(log_sed):
    # Two processor grades: P1 accepts >= 12 cm, P2 >= 18 cm.
    bins = np.array([
        np.sum((log_sed >= 12) & (log_sed < 18)),
        np.sum(log_sed >= 18),
    ], dtype=float)

    # Variables: low->P1, high->P1, high->P2.
    surplus = np.array([8.0, 11.0, 24.0])
    c = -surplus
    A = np.array([
        [1, 0, 0],  # low supply
        [0, 1, 1],  # high supply
        [1, 1, 0],  # P1 demand
        [0, 0, 1],  # P2 demand
    ], dtype=float)
    b = np.array([bins[0], bins[1], 120.0, 80.0])

    res = linprog(c, A_ub=A, b_ub=b, bounds=[(0, None)] * 3, method="highs")
    if not res.success:
        raise RuntimeError(res.message)
    return bins, res.x, -res.fun


def main():
    rng = np.random.default_rng(22)
    dbh = grow_trees(rng)
    logs = harvest_and_buck(rng, dbh)
    bins, flows, value = match_logs(logs)

    print("Standing trees:", len(dbh))
    print("Mean DBH after growth:", round(float(dbh.mean()), 2))
    print("Recovered logs:", len(logs))
    print("Log bins [12-18, >=18]:", bins.astype(int).tolist())
    print("Optimal flows [low->P1, high->P1, high->P2]:", np.round(flows, 2))
    print("Toy matching surplus:", round(float(value), 2))


if __name__ == "__main__":
    main()
