# Notation guide

This is a compact companion to the notation audit in the working paper.

## Spaces

- `D`: compact geographic metric space.
- `G`: finite species/genetic-class set.
- `Q_T`, `Q_L`: compact tree- and log-quality spaces.
- `M`: compact management-state space.
- `E_T`: marked tree state space.
- `E_L`: marked log state space.
- `E_P`: processor state space.
- `E_O`: operator state space.
- `M_+(E)`: finite nonnegative Radon measures on `E`.
- `P_2(E)`: probability measures with finite second moment.

## Tree and log state

A tree is

`xi = (location, age, log_d, log_h, genetics, quality, management)`.

A log is

`lambda = (location, small_end_diameter, large_end_diameter, length,
           genetics, log_quality, moisture)`.

Log mass is a state-dependent map `m_L(lambda)` rather than a universal
volume-to-tonne conversion.

## Measures

- `mu_t`: finite standing-tree measure.
- `bar_mu_t`: normalized standing-tree probability law when total mass is
  positive.
- `Lambda_t`: harvested log-count measure.
- `tilde_Lambda_t`: tonne-weighted log measure.
- `nu_t`: empirical processor measure.
- `kappa_t`: empirical operator measure.
- `Gamma_t`: log-processor-operator allocation measure.

## Finite particle notation

When a particle approximation is used:

`X_t^{i,N}` = state of particle `i` in an `N`-particle system.

`mu_t^N = (1/N) sum_i delta_{X_t^{i,N}}` = normalized empirical law.

A finite-mass empirical measure can instead carry explicit weights or counts.
The limiting measure is unlabelled; `i` is not a coordinate of the limit.

## Dynamics and controls

- `b_G`, `sigma_G`, `sigma_G^0`: drift, idiosyncratic diffusion, common-noise
  diffusion.
- `a_t^G`: biological/management action.
- `lambda_t^H`, `lambda_t^M`: harvest and mortality hazards.
- `B_t`: recruitment/planting-rate measure.
- `K_B`: bucking kernel from harvested tree state to a finite log measure.
- `u_t`: information/market/regime control in the Bayes-adaptive problem.

## Processor/matching objects

- `S_jr`: grade-acceptance set for processor `j`, grade `r`.
- `p_j^0(lambda)`: posted value for a compatible log.
- `c_t(lambda,j,k)`: delivered non-stumpage cost through operator `k`.
- `s_t(lambda,j,k)`: compatible delivered surplus.
- `D_t`, `O_t`: processor-demand and operator-capacity measures.
- `V_t(S,D,O)`: matching value.
- `phi`, `psi`, `omega`: dual potentials for supply, demand, capacity.

## Belief state

- `X_t`: latent physical state.
- `theta`: unknown structural parameters.
- `pi_t`: posterior law of `(X_t, theta)` conditional on information.
- `K(dpi' | pi,u)`: belief transition/filtering kernel.
- `V_t(pi)`: Bayes-adaptive value function.

## Reduced-order projection

- `H`: covered hectares.
- `N_A`, `N_P`: paying asset and processor accounts.
- `M_j`: matched processor tonnes.
- `R_A`, `R_S`: asset and supply revenues.
- `C`: recurring cost.
- `Pi`: operating surplus.

## Notational collision to avoid

Do not use `D` for both geographic domain and diameter in explanatory notes.
Use `d` or `DBH` for diameter and reserve `D` for the geographic metric space.
