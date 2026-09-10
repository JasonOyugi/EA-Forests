# NASA Earthdata Login setup (required for native GEDI/ALOS/JERS retrieval)

Date: 2026-09-10. This is the credential/access boundary for everything
in this programme that reads from NASA/JAXA archives directly (not via
Earth Engine): native GEDI L2A/L2B/L4A/L4C shot-level granules
(`docs/eo/GEDI_NATIVE_DISCOVERY.md`) and raw ALOS PALSAR/JERS-1 scenes
(`docs/eo/L_BAND_DISCOVERY.md`). **No credentials are stored in this
repository, and none should ever be.**

## What is blocked without this, and what is not

- **Discovery/search is NOT blocked.** NASA's CMR (`cmr.earthdata.nasa.gov`)
  and ASF's search API (`api.daac.asf.alaska.edu`) are public. This
  programme's discovery scripts
  (`backend/scripts/discover_gedi_native.py`) already run successfully
  with no credentials and should keep being run freely as history grows.
- **Granule download IS blocked.** A live `HEAD` request against a real
  LP DAAC download URL was confirmed to return `403 Forbidden` without
  authentication. This is the only blocked step.

## What the operator must do (outside this repository)

1. Create a free NASA Earthdata Login account at
   <https://urs.earthdata.nasa.gov/users/new> (a human action -- cannot be
   automated or fabricated by an agent).
2. Authorize the specific applications this programme will use for
   download (LP DAAC's data pool at minimum; ASF's Vertex/download
   service if raw ALOS PALSAR/JERS-1 scenes are pursued later). This is
   done once, from the Earthdata Login account's "Applications"
   settings, after first attempting a download through that service (it
   prompts for authorization).
3. Provide credentials to the runtime as **environment variables**, never
   as a committed file:
   - `EARTHDATA_USERNAME`
   - `EARTHDATA_PASSWORD`
   (or a `~/.netrc` entry for `urs.earthdata.nasa.gov`, which several
   NASA-provided Python clients such as `earthaccess` read automatically
   -- also never committed to this repository; add `.netrc` to the
   operator's own global git-ignore, not this repo's, since it does not
   belong inside any repository at all).

## What this codebase does with those credentials, once present

Nothing yet -- no code in this repository reads `EARTHDATA_USERNAME`/
`EARTHDATA_PASSWORD` or a `.netrc` today. The concrete next step, once an
operator confirms credentials are configured, is a small authenticated
download function (likely using the `earthaccess` library, NASA's
maintained wrapper over this exact flow) added to
`backend/app/services/eo/` alongside the existing discovery script --
scoped narrowly to fetching the specific granules a discovery pass
already identified, never a bulk regional archive pull.

## If credentials are not available

Every discovery-phase deliverable in this programme (GEDI granule
inventory, ALOS/JERS-1 scene inventory) already stops cleanly at
discovery and does not block any other workstream. Continue all national
S2/S1 history, change-candidate work, Kenya scale-up, Landsat, and the
Earth-Engine-accessible ALOS/PALSAR-2 global mosaic (no credential
needed for that one, see `docs/eo/L_BAND_DISCOVERY.md`) without waiting
on this.
