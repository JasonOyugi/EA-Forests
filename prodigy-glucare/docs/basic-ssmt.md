# Basic SSMT Layer

The Basic SSMT map layer uses processed static GeoJSON chunks under:

```text
public/data/basic-ssmt/
```

The browser never reads raw Esri file geodatabases. It first loads `metadata.json`, then only loads chunk files that match the active country, genus, species, and suitability filters.

## Source Inputs

Place these non-dominant-limitation source zips in one input directory:

```text
SSMT_Kenya.zip
SSMT_Tanzania.zip
SWIFT_SSMT_Uganda.zip
```

Dominant Limitation zips are intentionally excluded from this layer. They should become a separate map layer later.

## Requirements

Install GDAL with `ogr2ogr` and FileGDB/OpenFileGDB support available on `PATH`.

The script converts each FileGDB layer to EPSG:4326 GeoJSON, simplifies geometry, normalizes attributes, derives genus/species, then writes chunked GeoJSON plus a metadata manifest.

## Regenerate

From `vite-version/`:

```bash
npm run preprocess:ssmt -- --input-dir "C:\Users\JasonOyugi\Downloads"
```

Optional arguments:

```bash
npm run preprocess:ssmt -- --input-dir "C:\Users\JasonOyugi\Downloads" --simplify 0.0005
npm run preprocess:ssmt -- --input-dir "C:\Users\JasonOyugi\Downloads" --output-dir public/data/basic-ssmt
npm run preprocess:ssmt:self-test
```

The default output is `public/data/basic-ssmt`. The default simplification tolerance is `0.001` degrees after reprojection to EPSG:4326. Lower values preserve more geometry detail and produce larger chunks.

## Frontend Contract

`metadata.json` contains:

- `countries`
- `genera`
- `species`
- `suitability`
- `chunks`

Each chunk is a GeoJSON `FeatureCollection` whose features expose the normalized Basic SSMT schema used by the map popup and filters.

If `metadata.json` is present but `generated` is `false`, the map control remains usable and shows an empty/missing-data state until real chunks are generated.
