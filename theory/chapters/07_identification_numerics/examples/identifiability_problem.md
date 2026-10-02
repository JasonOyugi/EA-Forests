# Toy problem - Competition and site productivity can be confounded

Suppose observed annual log-DBH increment satisfies the toy model

`Delta Y = beta_0 + beta_site Z - gamma C + noise`,

where `Z` is site productivity and `C` is competition.

Imagine every high-productivity site in the dataset also has high competition,
and every low-productivity site has low competition. Then `Z` and `C` move
together.

## Question

Can the data cleanly distinguish `beta_site` from `gamma`?

Not necessarily. Many combinations of a strong positive site effect and strong
negative competition effect can produce similar fitted increments.

## Better design

Collect or retain stands that break the correlation:

- high productivity / low competition;
- high productivity / high competition;
- low productivity / low competition;
- low productivity / high competition.

The example illustrates why identifiability is partly an experimental-design
property, not merely a property of the equation written on paper.
