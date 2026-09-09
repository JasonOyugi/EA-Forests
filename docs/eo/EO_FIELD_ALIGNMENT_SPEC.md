# EO-field alignment specification v0.1

Date: 2026-09-09
Status: immutable analytical contract; no production biological model

## Purpose

Define the unit of evidence needed to compare field observations with EO measurements without conflating temporal mismatch, spatial support mismatch, geometry quality, acquisition geometry or environment with biological signal.

This dataset is analytical evidence. It does not overwrite field observations, EO series, management geometry or state snapshots.

## Alignment unit

Each alignment row represents one explicit pairing of:

```text
field observation/support
        <->
EO observation/support
```

The pair must retain identity and provenance for both sides.

Minimum conceptual fields:

```text
alignment_id
field_observation_id
field_support_geometry_observation_id
field_observed_at
field_temporal_precision
field_variable_keys

eo_series_id
eo_observation_id
eo_provider_key
eo_collection_key
eo_recipe_key
eo_recipe_version
eo_observed_at
eo_temporal_precision

delta_t_seconds
delta_t_days

spatial_relation
footprint_area_m2
intersection_area_m2
overlap_fraction
centroid_inside
centre_to_aoi_edge_m
minimum_footprint_to_edge_m
interior_support_class

geometry_confidence
source_support_class
species_or_genetic_context
management_context
terrain_context
environmental_context
acquisition_geometry_context

qc_flags
exclusion_reasons
created_at
alignment_contract_version
```

Fields are nullable when the source does not support them. Missing is preferable to fabricated precision.

## Temporal precision

Allowed analytical precision classes:

```text
DAY
MONTH
YEAR
AGE_ONLY
UNKNOWN
```

A field date must not be created from age alone.

If a planting date is derived from an independently observed field date minus recorded age, the planting date is separate derived evidence with explicit derivation lineage. It is not a raw field date.

## Delta-t

Where both timestamps are known:

```text
delta_t = t_EO - t_field
```

Store the signed exact duration and a convenient day representation. Do not replace the exact value with a compatibility class.

If one side has only month/year precision, preserve the interval/precision and do not invent a day-of-month. A later compatibility policy may reason over ranges.

## Temporal compatibility policy

Compatibility is versioned policy applied to raw temporal evidence, not an intrinsic property of the observations.

Conceptual classes:

```text
NEAR_SIMULTANEOUS
SHORT_OFFSET
MATERIAL_OFFSET
INCOMPATIBLE
UNKNOWN
```

The classifier may consider:
- exact/ranged delta-t;
- species/genetics where known;
- plantation age/development stage;
- known growth/phenology domain;
- whether an explicit growth adjustment exists;
- intervention history between observations.

No universal hard-coded day cutoff is defined in v0.1.

## Footprint/polygon overlap

For footprint-like observations:

```text
overlap_fraction = area(footprint intersection AOI) / area(footprint)
```

Use geodetically valid area calculations.

Also retain where computable:
- footprint area;
- intersection area;
- centroid-inside boolean;
- footprint-centre distance to AOI edge;
- minimum footprint-to-edge distance;
- terrain/slope/aspect context.

A centroid inside an AOI is not sufficient to assign a footprint to a stand.

## Interior support

Canonical management geometry is never eroded or modified.

Analysis-only masks may be generated as explicit derived support classes, initially:

```text
FULL_AOI
INTERIOR_10M
INTERIOR_20M
INTERIOR_30M
```

Sensor-specific support alternatives may be added where a fixed erosion distance is scientifically inappropriate.

Every alignment row records which support class was used.

## GEDI-specific requirements

GEDI rows should retain enough source identity to recover:
- product level/version;
- shot/footprint identity where available;
- acquisition date/time;
- quality/degradation/sensitivity flags relevant to the product;
- footprint geometry/support;
- RH/cover/AGBD variables actually used.

Do not treat monthly GEDI mosaics as if they were a single contemporaneous wall-to-wall observation. Footprint dates and support must be recovered before field calibration.

## Sentinel-1-specific requirements

Keep separate homogeneous series for:
- ASCENDING;
- DESCENDING;
- relevant relative-orbit/geometry groupings where required by the recipe.

Alignment context should retain incidence/acquisition geometry needed to investigate orbit effects. Never fuse orbit directions merely to increase sample count.

## Leakage-resistant validation groups

The alignment dataset must support future grouping by at least:

```text
stand_id
site_id
estate_id
country
field_campaign_or_year
```

This enables:
- leave-stand-out;
- leave-site-out;
- leave-year-out;
- country-transfer evaluation.

Train/test splitting must be performed on these grouped identities, not on arbitrary rows, to avoid repeated observations from the same stand leaking across folds.

## QC philosophy

`UNRESOLVED` is a valid outcome.

QC/exclusion flags should identify causes rather than collapse them into one quality score, for example:

```text
FIELD_DATE_UNKNOWN
EO_DATE_AGGREGATED_ONLY
FIELD_SUPPORT_UNKNOWN
LOW_GEOMETRY_CONFIDENCE
LOW_OVERLAP
EDGE_CONTAMINATION
INTERVENTION_BETWEEN_DATES
S1_ORBIT_GEOMETRY_UNCONTROLLED
GEDI_QUALITY_FAIL
TERRAIN_CONFOUNDING
ENVIRONMENTAL_CONFOUNDING
```

## v0.1 checkpoint

The current 10-site multi-sensor pull is not yet an alignment dataset:
- Tanzania EO was extracted over a 300 m buffer around medium-confidence points rather than verified field plot/stand support;
- the aggregate pilot output does not retain individual GEDI footprint geometry/date;
- current trial-site registry exposes measurement ages but not trustworthy field dates in the published registry;
- Uganda CFRs have useful polygon geometry but no field measurements.

Therefore no production calibration pair should be created from the existing aggregate pilot output alone.
