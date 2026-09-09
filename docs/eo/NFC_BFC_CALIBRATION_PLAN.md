# NFC / BFC calibration plan

Date: 2026-09-09
Status: calibration preparation, not calibrated biological inference

## 1. Purpose

NFC and BFC are deliberate, high-value calibration targets for EO-field observation-operator work. Their current canonical records are weak historical evidence only: reported/approximate points, unknown spatial precision, and dummy or empty forestry attributes. Those records must remain immutable evidence and must not be promoted into verified geometry or field truth.

The real plantations can still be calibrated by acquiring trustworthy geometry and field measurements and linking those as new evidence.

## 2. Calibration targets

### NFC Achwa Plantation

Current state:
- canonical estate identity exists in the `large-commercial-forests` source;
- geometry is a reported point with unknown precision;
- current forestry attributes are unpopulated template values;
- no calibration-grade field linkage exists.

Required next evidence:
1. authoritative estate/compartment/stand polygon;
2. stand/compartment identifiers and planting history;
3. field plots with exact spatial support and measurement date;
4. species/genetic material where known;
5. management history relevant to EO interpretation.

### NFC Luwunga Plantation

Current state:
- canonical estate identity exists;
- geometry is a reported point with unknown precision;
- current forestry attributes include dummy/test content and are not usable as field evidence;
- no calibration-grade field linkage exists.

Required evidence is the same hierarchy as Achwa, but must be sourced independently and not inferred from the current dummy record.

### NFC Namwasa Plantation

Current state:
- canonical estate identity exists;
- geometry is a reported point with unknown precision;
- current forestry attributes include dummy/test content and are not usable as field evidence;
- no calibration-grade field linkage exists.

Required evidence is the same hierarchy as Achwa/Luwunga.

### Busoga Forestry Company (BFC)

Current state:
- canonical `Busoga Forestry Company (BFC)` estate record exists;
- geometry is a reported point with unknown precision;
- current forestry attributes are dummy/test content;
- the specific plantation/estate boundary represented by the old record is not yet resolved from trustworthy source evidence.

Do not guess a plantation name. Resolve the real estate identity from authoritative company/management/GIS evidence before creating any new estate-level spatial identity.

## 3. Geometry evidence hierarchy

Prefer, in order:

1. authoritative compartment/stand GIS polygon;
2. plantation management shapefile/KML;
3. surveyed or GNSS boundary;
4. verified field digitisation;
5. carefully documented manual digitisation.

Every new geometry observation should retain:
- source and responsible organisation/person;
- acquisition method;
- acquisition/observation date;
- original CRS;
- stated precision or GNSS accuracy where available;
- raw artifact;
- transformation/reprojection history;
- relation to estate/parcel/stand identity;
- whether the geometry is management, legal, compartment, stand, or plot support.

Never overwrite the old reported point. Add a new geometry observation/AOI version.

## 4. Stand and compartment attributes to seek

For each mapped unit, collect only what is actually available:
- stand/compartment ID;
- area;
- species;
- clone/provenance/genetic material;
- planting date;
- spacing;
- stocking;
- thinning history;
- pruning history;
- fertilisation where relevant;
- fire/disturbance history;
- harvest history;
- management regime.

Missing values remain missing.

## 5. First field-calibration protocol

The first campaign should prioritise variables that materially improve EO calibration.

Required:
- plot ID;
- exact plot geometry or GNSS centre plus plot shape/radius;
- measurement datetime;
- species/genetics where known;
- tree ID where feasible;
- DBH;
- height;
- alive/dead status;
- stem count/survival;
- plot area;
- management notes.

Useful where practical:
- crown dimensions or crown class;
- canopy closure;
- health/damage;
- evidence of recent thinning/harvest;
- geotagged photographs;
- GNSS accuracy metadata.

Avoid adding measurements solely because they are traditional inventory variables if they do not improve the planned observation-operator tests.

## 6. Sampling design

Do not preferentially sample visually striking satellite pixels.

Use a documented stratified design. Candidate strata include:
- age class;
- species/genetics;
- stand development/stocking class;
- terrain/slope/aspect;
- management regime;
- apparent canopy-structure class from EO, used only as one stratification variable and not as truth.

Where practical record:
- sampling frame;
- stratum definition;
- plot-selection mechanism;
- inclusion probability or selection weight;
- replacements/non-response.

The design objective is estimation and validation of observation relationships, including negative/weak relationships, not producing attractive examples.

## 7. Temporal alignment

Plan fieldwork close to useful acquisitions where operationally realistic:
- Sentinel-2;
- Sentinel-1 ascending/descending;
- NISAR or other L-band acquisition where available;
- GEDI only where footprint timing and coverage happen to align.

Exact simultaneity is not mandatory. Record actual field and EO dates and compute `delta_t` later. Never infer a field date from tree age.

## 8. Verification tasks

Use the canonical verification-task framework with narrowly stated uncertainty targets.

Recommended task templates per estate/stand:
1. `Verify stand boundary and support type` — resolves whether the current mapped boundary is legal, estate, compartment, stand, or approximate.
2. `Confirm species/genetic material` — resolves biological mark needed for observation-model interpretation.
3. `Confirm planting date` — resolves stand age using direct management evidence rather than reverse-calculation where available.
4. `Measure DBH/height distribution` — provides field response variables for calibration.
5. `Confirm stocking/survival` — provides density/competition context.
6. `Confirm management history` — records thinning, pruning, fire, harvest or other interventions relevant to EO change.

Do not use a vague task such as `verify forest`.

## 9. EO already useful before fieldwork

For each target, catalogue rather than infer:
- Sentinel-2 acquisition availability;
- Sentinel-1 ascending and descending availability;
- GEDI footprint availability and quality-qualified counts;
- ALOS/PALSAR-2 availability;
- NISAR availability when accessible;
- terrain context.

Do not interpret these observations biologically until spatial support and timing are aligned to verified field units.

## 10. Calibration qualification rule

A target becomes a calibration pilot only when it has:
1. high-confidence spatial support for the actual field unit;
2. real field measurements linked to that support;
3. explicit field and EO dates or defensible temporal precision;
4. sufficient spatial overlap/support for the sensor being tested;
5. QC metadata sufficient to exclude obvious confounding.

Until then it remains a calibration target, not a calibration result.

## 11. Expected information value ranking

No invented monetary or probabilistic EIG values are assigned yet.

Qualitative ranking:
- **Very high:** verified stand/compartment geometry, because it unlocks spatial overlap and makes existing EO interpretable.
- **Very high:** dated DBH/height/stocking field plots, because no current Uganda commercial-estate record supplies real calibration measurements.
- **High:** planting date/species/genetics, because these condition growth and structural interpretation.
- **High:** thinning/harvest/fire history, because these can otherwise masquerade as sensor-state relationships.
- **Medium:** ancillary crown/photographic variables, useful for interpretation but secondary to geometry/date/DBH/height/stocking in the first campaign.

## 12. Immediate campaign sequence

1. Resolve trustworthy estate/compartment geometry for Achwa, Luwunga, Namwasa and the real BFC plantation represented by the old source record.
2. Register new geometry evidence without mutating historical points.
3. Establish a stratified field sampling frame.
4. Schedule field measurements near useful S1/S2/L-band windows where practical.
5. Create the narrow verification tasks above.
6. Build EO-field alignment rows with exact support/date provenance.
7. Only then test GEDI/S1/S2/L-band observation relationships.

No production EO-to-DBH, volume or merchantable-timber inference is authorised by this plan.
