# Toy problem - Density-only versus size-weighted competition

Consider two stands, each with 100 trees.

- Stand A: every tree has DBH 10 cm.
- Stand B: 50 trees have DBH 5 cm and 50 trees have DBH 20 cm.

A density-only competition index gives both stands the same value: 100 stems.

Now use the toy basal-area-like moment

`G(mu) = average(DBH^2)`.

For Stand A:

`G_A = 10^2 = 100`.

For Stand B:

`G_B = 0.5(5^2) + 0.5(20^2) = 212.5`.

The stands have equal stem density but very different size-weighted crowding.

## Question

Does this prove that basal area is the correct competition variable?

No. It only proves that a law-dependent model can distinguish population
structures that scalar density cannot. The appropriate kernel or summary must be
identified from biological data and the spatial resolution available.
