# Chapter 4 summary - Processor compatibility, matching, dual value, and price

This chapter turns the harvested log measure into a market allocation problem.

Each processor is represented by grade-specific acceptance sets over log space:
diameter, length, species/genetics, quality, moisture, and any other measurable
constraint can determine whether a log is admissible. Price can be a posted
per-tonne schedule or a quantity-dependent marginal willingness to pay.

Hard grade thresholds create discontinuities. To support stable estimation and
optimization under measurement error, the paper also introduces smoothed grade
compatibility probabilities. These converge toward hard classification as
measurement error shrinks, while remaining continuous under weak changes in the
log measure.

Delivered surplus is defined per feasible log-processor-operator triple as
processor value minus felling, extraction, loading, haulage, QA, compliance, and
risk costs. Infeasible triples are removed.

Allocation is then a capacitated **partial transport** problem. The allocation
measure cannot exceed available log supply, processor demand, or operator
capacity. Unmatched logs, unmet demand, and idle capacity are allowed. With
linear value it is a continuous linear program; with concave grade-quantity
value it remains a convex optimization problem.

The dual problem is economically important. Its potentials are marginal values
of additional compatible supply, demand, and operator capacity. A tonne matters
more when it lies in a scarce, high-value part of log space than when it adds to
an already abundant grade.

The chapter then separates transport value from negotiated forest-gate price.
Seller outside options, buyer reservation value, search risk, and bargaining can
change the realized price even after the technical allocation problem is
solved.

This chapter is the point at which "commercially useful supply" becomes an
endogenous output rather than a scalar assumption. The next chapter asks how a
decision maker should act when both this physical state and its structural
parameters are only partially observed.
