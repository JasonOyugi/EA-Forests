# Toy problem - Wait or switch observation regime?

A controller is in a low-cost observation regime. Staying for one more period
has expected continuation value 80. Switching immediately to a richer regime
has value 125 but costs 35.

## Question 1

Should the controller switch now?

Net switch value is `125 - 35 = 90`, which exceeds 80, so the toy recursion
selects switching.

## Question 2

Suppose a cheap observation available in the current regime will arrive next
period and could raise or lower the estimated rich-regime value. Why might
waiting be optimal even if 90 currently exceeds 80 by a small margin?

Because waiting has option value. The observation can prevent an irreversible
or expensive switch in states where the richer regime turns out to be less
valuable. In the full model this comparison is embedded in the posterior
continuation operator rather than handled by an ad hoc threshold.
