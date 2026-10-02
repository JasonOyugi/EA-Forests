# Toy problem - What does an empirical measure forget?

Consider three labelled tree states at time `t`:

`X_t^{1,3}=10`, `X_t^{2,3}=20`, `X_t^{3,3}=30`.

Their empirical law is

`mu_t^3 = (delta_10 + delta_20 + delta_30)/3`.

Now swap the labels of trees 1 and 3. The empirical law is unchanged.
Therefore the map from labelled particles to the empirical measure is many to
one.

## Consequence

The measure retains the distribution of states but not which historical tree
produced which atom. If repeated-tree growth increments are required for
calibration, keep a separate association key such as `(plot_id, tree_id)` in the
data layer.

## Exercise

Suppose the next observation is the unordered set `{12,21,31}`. Can the measure
alone identify which tree moved from 10 to 12?

No. The finite observation model needs a data-association rule or stable ID. The
limiting mean-field state does not supply that information automatically.
