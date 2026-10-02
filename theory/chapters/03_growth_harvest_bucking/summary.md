# Chapter 3 summary - Growth, mortality, harvest, and the tree-to-log map

This chapter gives dynamics to the standing-tree state and then converts
harvested trees into heterogeneous logs.

Within a fixed site/species/management class, a representative tree evolves in
log-diameter, log-height, and quality under a conditional McKean-Vlasov SDE.
The drift and diffusion may depend on the current population law, so competition
can be represented by a mean-field interaction rather than by a scalar density
term alone. Common noise represents shared site-year shocks; idiosyncratic noise
represents tree-level heterogeneity.

Age remains explicit through `da_t = dt`. The diffusion term is not meant to
absorb measurement error. Measurement error belongs in the later observation
model, and richer stochastic dynamics should be supported by repeated-tree
data.

The probability-law dynamics describe composition among surviving trees, but
total mass also changes. Mortality, harvest, and recruitment therefore appear
in a finite-measure evolution equation. Harvest is represented by a state- and
decision-dependent hazard.

The economically decisive step is the **bucking kernel**. Conditional on a
harvested-tree state and a cutting rule, the kernel returns a finite measure of
log types. The resulting log measure carries end diameters, length, quality,
species/genetics, moisture, and location. A state-dependent density/volume map
converts it to a tonne-weighted measure.

Bucking can itself be optimized. Rather than maximizing recovered volume alone,
the cutting pattern can maximize downstream value. If the downstream log-value
function comes from the matching problem's dual values, the preferred cut can
change when processor specifications or spatial scarcity change.

The chapter therefore establishes the structural bridge

`standing trees -> harvested trees -> log distribution -> tonne-weighted supply`.

The next chapter takes that log supply as input and determines which logs are
compatible with which processors and operators.
