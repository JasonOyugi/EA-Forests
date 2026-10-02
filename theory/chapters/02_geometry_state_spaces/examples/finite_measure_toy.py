"""Synthetic finite-measure versus probability-law example."""

import numpy as np


def normalized_histogram(counts):
    counts = np.asarray(counts, dtype=float)
    return counts / counts.sum()


def main():
    # Three DBH classes: small, medium, large.
    stand_a = np.array([20, 50, 30])
    stand_b = np.array([200, 500, 300])

    p_a = normalized_histogram(stand_a)
    p_b = normalized_histogram(stand_b)

    print("Stand A total mass:", stand_a.sum())
    print("Stand B total mass:", stand_b.sum())
    print("Normalized A:", p_a)
    print("Normalized B:", p_b)
    print("Same normalized composition:", np.allclose(p_a, p_b))

    # A toy payoff that depends on total number of large trees.
    value_per_large_tree = 10.0
    value_a = stand_a[-1] * value_per_large_tree
    value_b = stand_b[-1] * value_per_large_tree
    print("Toy value A:", value_a)
    print("Toy value B:", value_b)


if __name__ == "__main__":
    main()
