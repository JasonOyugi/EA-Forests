-- processing.eo_job never stored which provider/collection it targets --
-- every job was implicitly Sentinel-2 because that was the only recipe
-- that existed. Adding the Sentinel-1 recipe (Uganda S2 history v0.1 ->
-- multi-sensor programme) exposed this: execute_claimed_job() had to
-- hardcode "COPERNICUS/S2_SR_HARMONIZED", silently ignoring a Sentinel-1
-- job's real collection. These columns make provider/collection part of the
-- job's own persisted, immutable request identity, same as recipe_key.
--
-- Existing rows are backfilled to the Sentinel-2 values they were always
-- implicitly using; new inserts always specify both explicitly (worker.py's
-- enqueue()).
ALTER TABLE processing.eo_job ADD COLUMN provider_key TEXT NOT NULL DEFAULT 'google_earth_engine';
ALTER TABLE processing.eo_job ADD COLUMN collection_key TEXT NOT NULL DEFAULT 'COPERNICUS/S2_SR_HARMONIZED';
ALTER TABLE processing.eo_job ALTER COLUMN provider_key DROP DEFAULT;
ALTER TABLE processing.eo_job ALTER COLUMN collection_key DROP DEFAULT;

-- provider_key/collection_key are REQUEST IDENTITY, immutable once set --
-- deliberately NOT added to guard_eo_job()'s mutable-fields whitelist.
