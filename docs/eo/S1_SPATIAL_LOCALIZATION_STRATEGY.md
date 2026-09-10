# Sentinel-1 spatial localization strategy (not yet implemented)

Date: 2026-09-10. Documents WHY the S2 grid-cell method
(`backend/scripts/localize_change_evidence_s2.py`) cannot simply be
repeated on radar, per explicit instruction, before any S1 localization
code is written.

## What the S2 method assumes that does not hold for S1

1. **Per-image cloud masking vs. per-image speckle.** S2's support metric
   is "was this pixel SCL-clear in this acquisition" -- a real, physical
   yes/no per pixel per date. S1 has no equivalent binary mask: every
   pixel in every acquisition has a real backscatter value, corrupted by
   multiplicative speckle noise that does not average out the same way
   cloud occlusion does. A cell-level "support fraction" concept does not
   transfer directly.
2. **Orbit/incidence-angle heterogeneity within one AOI.** A single S1
   scene's incidence angle varies across its swath; a grid cell near one
   edge of a large AOI can see a meaningfully different incidence angle
   than a cell near the other edge, independent of any real backscatter
   change. The relative-orbit composition confounder already documented
   at CFR level (`docs/eo/S1_STREAM_IDENTITY.md`) can in principle vary
   spatially within one CFR too, not just temporally.
3. **Terrain/slope-aspect interaction.** Radar backscatter is sensitive to
   local incidence angle relative to terrain slope/aspect (layover,
   foreshortening, shadow) in a way optical reflectance is not at these
   resolutions. A naive per-cell dB difference can encode terrain
   geometry, not vegetation change.
4. **dB vs. linear-power arithmetic.** Averaging or differencing
   Sentinel-1's log-scaled (dB) band values is not equivalent to
   averaging/differencing the underlying linear-power backscatter; which
   domain a statistic is computed in must be explicit and consistent
   between baseline and candidate windows.

## What S1 localization needs instead (not built yet)

- Multi-temporal speckle reduction (e.g. a multi-look/temporal-averaging
  approach with a documented, versioned effective number of looks) before
  any per-cell differencing -- not a single-date-pair comparison.
- Per-cell incidence-angle and terrain slope/aspect as explicit recorded
  covariates, not implicit noise.
- Relative-orbit composition checked at the SPATIAL level (does the same
  set of relative orbits cover this specific cell in both windows), not
  only at the CFR/direction level already computed.
- Linear-power domain for any averaging step, converting back to dB only
  for display, with the conversion point documented and versioned.
- Prefer patch-level or multi-temporal stacks over single-pixel
  differencing, per instruction -- likely a coarser grid than S2's, given
  S1's larger effective resolution cell after speckle reduction.

## Status

Not implemented this pass -- correctly scoped as a separate, harder
problem rather than forced into the S2 grid-cell code path. The S2
method (`localize_change_evidence_s2.py`) is a template for the
mechanics (grid construction, common-support gating, connected-region
formation, artifact + metadata attachment), not for the physics, which
must be redone for radar.
