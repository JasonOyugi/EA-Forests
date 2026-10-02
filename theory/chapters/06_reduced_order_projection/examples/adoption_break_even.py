"""Toy reduced-order pricing, break-even, and cost-elasticity calculations."""

import numpy as np
from scipy.special import lambertw


def adoption(p, alpha, eta):
    return 1.0 / (1.0 + np.exp(eta * p - alpha))


def revenue(p, base, alpha, eta):
    return base * p * adoption(p, alpha, eta)


def optimal_price(alpha, eta):
    return float((1.0 + lambertw(np.exp(alpha - 1.0)).real) / eta)


def total_cost(h, fixed, a, beta):
    return fixed + a * h**beta


def local_cost_elasticity(h, fixed, a, beta):
    variable = a * h**beta
    return beta * variable / (fixed + variable)


def main():
    alpha = 3.0
    eta = 0.8
    base = 1000.0

    p_star = optimal_price(alpha, eta)
    grid = np.linspace(0.01, 8.0, 5000)
    p_grid = grid[np.argmax(revenue(grid, base, alpha, eta))]
    print("Analytic optimal price:", round(p_star, 4))
    print("Grid-check optimal price:", round(float(p_grid), 4))

    fixed = 160.0
    a = 0.0005
    beta = 1.0
    for h in (100_000, 500_000, 1_000_000):
        c = total_cost(h, fixed, a, beta)
        e = local_cost_elasticity(h, fixed, a, beta)
        print(f"H={h:>8,d} cost={c:8.2f} local elasticity={e:.3f}")

    # Toy break-even frontier: m_A * B_A + f_S * B_S = C.
    B_A = 2_000_000.0
    B_S = 500_000.0
    cost = 600_000.0
    for m_a in (0.05, 0.10, 0.20):
        f_s = max(0.0, (cost - m_a * B_A) / B_S)
        print(f"If m_A={m_a:.2f}, break-even supply fee f_S={f_s:.3f}")


if __name__ == "__main__":
    main()
