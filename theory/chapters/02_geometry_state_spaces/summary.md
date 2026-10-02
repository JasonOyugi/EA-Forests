# Chapter 2 summary - State spaces, finite measures, and geometry

This chapter defines the objects on which the rest of the model operates.

A tree state carries location, age, log-diameter, log-height, biological class,
quality, and management condition. A log state carries location, end diameters,
length, biological class, log quality, and moisture. Processor and operator
states carry their own specifications, demand/capacity, productivity, cost, and
location information.

The most important distinction is between two kinds of measure.

A **probability law** describes the composition of a representative surviving
population. Its total mass is one, so quadratic Wasserstein distance is natural
for describing displacement through continuous state space.

A **finite positive measure** also carries economically meaningful total mass.
Mortality, harvest, recruitment, and unmatched supply can change that mass.
For these objects the paper uses Hellinger-Kantorovich / unbalanced-transport
geometry, which combines movement with creation or destruction of mass.

Species and other discrete biological marks are not treated as continuous
coordinates. The state is stratified by biological class, with continuous
dynamics inside a stratum and explicit kernels for any meaningful discrete
transition.

The chapter also separates linear convexity from geodesic convexity. Finite
positive measures form a convex cone under ordinary mixing, while Wasserstein
or HK geodesics describe non-Euclidean displacement. The distinction matters
because only some parts of the eventual optimization problem are convex.

A red-team clarification is crucial: the limiting measure is unlabelled.
Finite particles may be written `X_t^{i,N}`, with `i` tracking a sampled tree and
`N` the particle-system size, but identity should live in the observation or
data-association layer unless it changes the scientific state itself.

Finally, controls are given a compact topology and can be relaxed into
probability measures over actions when convexification is useful. This gives a
clean existence framework without averaging away hard processor specifications
or biological classes.
