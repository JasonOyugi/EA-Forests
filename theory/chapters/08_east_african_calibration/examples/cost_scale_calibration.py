"""Reproduce the cost-identification lesson in the working paper.

The three cost anchors are working-paper calibration values in USD thousands
per year, not new observations.
"""

import numpy as np
from scipy.optimize import least_squares


H = np.array([100_000.0, 500_000.0, 1_000_000.0])
C = np.array([219.0, 424.0, 669.0])
X = H / 100_000.0


def fit_pure_power():
    # log C = log a + beta log X
    beta, log_a = np.polyfit(np.log(X), np.log(C), 1)
    a = np.exp(log_a)
    return a, beta


def fit_fixed_plus_power():
    def residual(p):
        fixed, a, beta = p
        return fixed + a * X**beta - C

    result = least_squares(residual, x0=np.array([163.0, 56.0, 0.95]))
    return result.x


def main():
    a0, beta0 = fit_pure_power()
    fixed, a1, beta1 = fit_fixed_plus_power()

    print("Pure power fit: C = a * (H/100k)^beta")
    print(f"  a={a0:.3f}, beta={beta0:.3f}")

    print("Fixed + variable power fit:")
    print(f"  fixed={fixed:.3f}, a={a1:.3f}, beta={beta1:.3f}")

    pred0 = a0 * X**beta0
    pred1 = fixed + a1 * X**beta1
    print("\nAnchor comparison (USDk/year):")
    for h, obs, p0, p1 in zip(H, C, pred0, pred1):
        print(f"  H={h:9.0f} observed={obs:7.2f} pure={p0:7.2f} fixed+var={p1:7.2f}")

    print("\nWorking-paper reference formula: fixed=162.8, a=56.2, beta=0.955")


if __name__ == "__main__":
    main()
