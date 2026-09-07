-- Add a neutral geometry provenance method for polygons copied from a
-- repository export with no recoverable acquisition/transformation history.
-- "digitised" implies a specific human tracing method that is not evidenced
-- here; "repository_derived" makes no acquisition-method claim at all.
ALTER TABLE geo.geometry_observation DROP CONSTRAINT geometry_observation_method_check;
ALTER TABLE geo.geometry_observation ADD CONSTRAINT geometry_observation_method_check
  CHECK (method = ANY (ARRAY['surveyed'::text, 'gps'::text, 'official_kml'::text, 'digitised'::text,
    'remote_sensing'::text, 'geocoded'::text, 'reported_coordinate'::text, 'centroid_estimate'::text,
    'display_offset'::text, 'repository_derived'::text]));
