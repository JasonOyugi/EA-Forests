# Toy problem - Same volume, different economic state

This is a synthetic example.

Two forests, A and B, each have:

- 100 ha;
- 20,000 m3 standing volume;
- the same average stump-to-road harvesting cost before haulage.

A target processor accepts logs only if small-end diameter is at least 18 cm.
It pays USD 70 per compatible tonne. For the toy calculation, assume one cubic
metre becomes one tonne; this simplification is deliberately unlike the full
paper, which uses a state-dependent density/volume map.

Forest A:

- 80% of recoverable volume meets the diameter rule;
- delivered non-stumpage cost is USD 30/t.

Forest B:

- 30% of recoverable volume meets the diameter rule;
- delivered non-stumpage cost is USD 50/t.

## Question 1

If all compatible material can be sold, what is the processor-compatible
surplus for each forest?

### Solution

Forest A has

`20,000 x 0.80 = 16,000 t`

of compatible supply. Surplus per compatible tonne is

`70 - 30 = USD 40/t`.

So total compatible surplus is

`16,000 x 40 = USD 640,000`.

Forest B has

`20,000 x 0.30 = 6,000 t`

of compatible supply. Surplus per compatible tonne is

`70 - 50 = USD 20/t`.

So total compatible surplus is

`6,000 x 20 = USD 120,000`.

The forests are identical under hectares and total standing volume, but the toy
commercial surplus differs by more than a factor of five.

## Question 2

Which state information was required to distinguish them?

At minimum:

- a distribution of recoverable diameters, not only average volume;
- the processor's acceptance rule;
- spatial/operating cost.

The full theory adds log length, quality, species/genetics, moisture/density,
operator capacity, uncertainty, and alternative buyers.

## Lesson

A scalar inventory can be a useful projection. It is not a sufficient market
state unless the variables being averaged away are irrelevant to every
subsequent decision.
