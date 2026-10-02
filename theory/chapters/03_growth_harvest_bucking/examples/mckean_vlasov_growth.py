"""Toy McKean-Vlasov forestry simulation with common and idiosyncratic noise.

This is synthetic pedagogy, not a calibrated growth model.
"""

from pathlib import Path

import matplotlib.pyplot as plt
import numpy as np


def simulate(seed=7, n=400, years=8.0, dt=0.02):
    rng = np.random.default_rng(seed)
    steps = int(years / dt)

    # Initial DBH around 10 cm in log space.
    y = np.log(rng.lognormal(mean=np.log(10.0), sigma=0.12, size=n))
    alive = np.ones(n, dtype=bool)

    r = 0.20
    d_max = 45.0
    gamma = 0.00012
    sigma = 0.08
    sigma_common = 0.045
    mortality_base = 0.01

    times = []
    mean_dbh = []
    q10 = []
    q90 = []
    alive_count = []

    for step in range(steps):
        t = step * dt
        idx = np.flatnonzero(alive)
        if idx.size == 0:
            break

        dbh = np.exp(y[idx])
        # Size-weighted mean-field competition. Scale by surviving population.
        competition = np.mean(dbh**2)

        common = rng.normal() * np.sqrt(dt)
        idio = rng.normal(size=idx.size) * np.sqrt(dt)

        drift = r * (1.0 - dbh / d_max) - gamma * competition
        y[idx] += drift * dt + sigma * idio + sigma_common * common

        # State-dependent mortality: small stressed trees have slightly higher risk.
        dbh_new = np.exp(y[idx])
        hazard = mortality_base + 0.015 * (dbh_new < 8.0)
        die = rng.random(idx.size) < (1.0 - np.exp(-hazard * dt))
        alive[idx[die]] = False

        # Toy harvest after year 6 for trees above 28 cm.
        if t >= 6.0:
            idx2 = np.flatnonzero(alive)
            dbh2 = np.exp(y[idx2])
            harvest_hazard = 0.65 * (dbh2 >= 28.0)
            cut = rng.random(idx2.size) < (1.0 - np.exp(-harvest_hazard * dt))
            alive[idx2[cut]] = False

        if step % 10 == 0:
            current = np.exp(y[alive])
            if current.size:
                times.append(t)
                mean_dbh.append(current.mean())
                q10.append(np.quantile(current, 0.10))
                q90.append(np.quantile(current, 0.90))
                alive_count.append(current.size)

    return np.array(times), np.array(mean_dbh), np.array(q10), np.array(q90), np.array(alive_count)


def main():
    t, mean_dbh, q10, q90, count = simulate()
    print(f"Final surviving/standing particles: {count[-1]}")
    print(f"Final mean DBH among survivors: {mean_dbh[-1]:.2f} cm")
    print(f"Final 10-90 percent range: {q10[-1]:.2f}-{q90[-1]:.2f} cm")

    fig, ax = plt.subplots(figsize=(8, 4.5))
    ax.plot(t, mean_dbh, label="mean DBH")
    ax.fill_between(t, q10, q90, alpha=0.2, label="10-90% among survivors")
    ax.set_xlabel("Years")
    ax.set_ylabel("DBH (cm)")
    ax.set_title("Toy interacting growth with common noise and harvest")
    ax.legend()
    fig.tight_layout()

    out = Path(__file__).with_name("mckean_vlasov_growth.png")
    fig.savefig(out, dpi=160)
    print("Wrote", out)


if __name__ == "__main__":
    main()
