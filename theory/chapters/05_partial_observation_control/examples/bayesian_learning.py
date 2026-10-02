"""Toy Bayesian experimental-design / EVSI calculation.

Synthetic example. There are two latent processor states and two harvesting
choices. A noisy test is valuable only because the preferred action can change.
"""

import numpy as np


STATES = ("low_acceptance", "high_acceptance")
ACTIONS = ("small_harvest", "large_harvest")

# Profit by latent state and action.
PROFIT = {
    ("low_acceptance", "small_harvest"): 40.0,
    ("low_acceptance", "large_harvest"): -30.0,
    ("high_acceptance", "small_harvest"): 45.0,
    ("high_acceptance", "large_harvest"): 110.0,
}

# P(signal="positive" | state)
TEST_POS = {"low_acceptance": 0.20, "high_acceptance": 0.85}


def best_expected_profit(prior):
    values = {}
    for action in ACTIONS:
        values[action] = sum(prior[s] * PROFIT[(s, action)] for s in STATES)
    best = max(values, key=values.get)
    return best, values[best], values


def posterior(prior, signal_positive):
    likelihood = {
        s: TEST_POS[s] if signal_positive else 1.0 - TEST_POS[s] for s in STATES
    }
    unnorm = {s: prior[s] * likelihood[s] for s in STATES}
    z = sum(unnorm.values())
    return {s: unnorm[s] / z for s in STATES}, z


def main():
    prior = {"low_acceptance": 0.55, "high_acceptance": 0.45}
    action0, value0, values0 = best_expected_profit(prior)

    post_pos, p_pos = posterior(prior, True)
    post_neg, p_neg = posterior(prior, False)

    action_pos, value_pos, _ = best_expected_profit(post_pos)
    action_neg, value_neg, _ = best_expected_profit(post_neg)

    value_with_test = p_pos * value_pos + p_neg * value_neg
    evsi = value_with_test - value0

    print("Prior action values:", values0)
    print("Best action without test:", action0, "value", round(value0, 2))
    print("P(positive signal):", round(p_pos, 3))
    print("Posterior after positive:", post_pos)
    print("Action after positive:", action_pos)
    print("Posterior after negative:", post_neg)
    print("Action after negative:", action_neg)
    print("Expected value with free test:", round(value_with_test, 2))
    print("EVSI before test cost:", round(evsi, 2))

    # A useful experiment only if test cost is below EVSI.
    for test_cost in (5.0, 20.0, 40.0):
        print(
            f"Test cost {test_cost:4.1f}: net value of testing = {evsi - test_cost:6.2f}"
        )


if __name__ == "__main__":
    main()
