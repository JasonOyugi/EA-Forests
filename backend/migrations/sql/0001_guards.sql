-- History may only close knowledge once; content is never rewritten or deleted.
CREATE FUNCTION audit.guard_history() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN RAISE EXCEPTION 'immutable history: %', TG_TABLE_NAME; END IF;
  IF TG_ARGV[0] = 'temporal' AND OLD.superseded_at IS NULL AND NEW.superseded_at IS NOT NULL
     AND (to_jsonb(OLD) - ARRAY['superseded_at','valid_period','knowledge_period']) =
         (to_jsonb(NEW) - ARRAY['superseded_at','valid_period','knowledge_period']) THEN
    IF NEW.superseded_at <= OLD.recorded_at THEN RAISE EXCEPTION 'invalid knowledge boundary'; END IF;
    RETURN NEW;
  END IF;
  RAISE EXCEPTION 'immutable history: %', TG_TABLE_NAME;
END $$;

CREATE FUNCTION audit.record_change() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE actor text; reason text; record jsonb;
BEGIN
  actor := nullif(current_setting('canonical.actor', true), '');
  reason := nullif(current_setting('canonical.reason', true), '');
  IF actor IS NULL OR reason IS NULL THEN RAISE EXCEPTION 'canonical actor and reason required'; END IF;
  record := CASE WHEN TG_OP = 'DELETE' THEN to_jsonb(OLD) ELSE to_jsonb(NEW) END;
  INSERT INTO audit.change_event(table_name, record_id, action, actor, reason, details)
  VALUES (TG_TABLE_SCHEMA || '.' || TG_TABLE_NAME, (record->>'id')::uuid, lower(TG_OP), actor, reason,
    jsonb_build_object('superseded_at', record->'superseded_at'));
  RETURN NULL;
END $$;

CREATE FUNCTION observations.validate_fact() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE variable observations.variable_definition; w core.world; origin evidence.source;
        value jsonb; category jsonb;
BEGIN
  SELECT * INTO STRICT variable FROM observations.variable_definition WHERE id=NEW.variable_definition_id;
  SELECT * INTO STRICT w FROM core.world WHERE id=NEW.world_id;
  SELECT * INTO STRICT origin FROM evidence.source WHERE id=NEW.source_id;
  IF (origin.data_class = 'SYNTHETIC' OR EXISTS (SELECT 1 FROM evidence.evidence_item WHERE id=NEW.evidence_item_id AND data_class='SYNTHETIC')) AND NEW.epistemic_class <> 'SYNTHETIC' THEN
    RAISE EXCEPTION 'synthetic source cannot be relabelled';
  END IF;
  IF w.kind='production' THEN
    IF NEW.epistemic_class='SCENARIO' THEN RAISE EXCEPTION 'scenario facts forbidden in production'; END IF;
    IF NEW.epistemic_class='SYNTHETIC' AND NOT w.allow_synthetic THEN RAISE EXCEPTION 'synthetic facts forbidden in production'; END IF;
  END IF;
  IF TG_TABLE_NAME='assertion' AND NEW.epistemic_class='OBSERVED' THEN
    RAISE EXCEPTION 'measured values belong in observation';
  END IF;
  IF TG_TABLE_NAME='observation' AND NEW.epistemic_class='REPORTED' THEN
    RAISE EXCEPTION 'reported values belong in assertion';
  END IF;
  IF NEW.unit IS DISTINCT FROM variable.canonical_unit THEN RAISE EXCEPTION 'canonical unit mismatch'; END IF;
  IF NEW.missingness IS NULL THEN
    value := to_jsonb(NEW)->(variable.data_type || '_value');
    IF value IS NULL OR value='null'::jsonb THEN RAISE EXCEPTION 'canonical value type mismatch'; END IF;
    IF NEW.numeric_value < variable.minimum OR NEW.numeric_value > variable.maximum THEN
      RAISE EXCEPTION 'value outside canonical variable domain';
    END IF;
    category := variable.valid_domain->'categories';
    IF variable.data_type='categorical' AND category IS NOT NULL AND NOT category ? NEW.categorical_value THEN
      RAISE EXCEPTION 'unregistered category';
    END IF;
  END IF;
  IF (NEW.uncertainty->>'lower')::numeric > (NEW.uncertainty->>'upper')::numeric
     OR (NEW.uncertainty->>'standard_error')::numeric < 0
     OR (NEW.uncertainty->>'standard_deviation')::numeric < 0
     OR (NEW.uncertainty->>'measurement_precision')::numeric < 0 THEN
    RAISE EXCEPTION 'invalid uncertainty';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_observation BEFORE INSERT ON observations.observation FOR EACH ROW EXECUTE FUNCTION observations.validate_fact();
CREATE TRIGGER validate_assertion BEFORE INSERT ON observations.assertion FOR EACH ROW EXECUTE FUNCTION observations.validate_fact();

-- Compare the worlds of related objects at the database boundary, including direct SQL.
CREATE FUNCTION core.check_world_reference() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE reference_id uuid; reference_world uuid; own_world uuid;
BEGIN
  reference_id := (to_jsonb(NEW)->>TG_ARGV[0])::uuid;
  IF reference_id IS NULL THEN RETURN NEW; END IF;
  own_world := (to_jsonb(NEW)->>'world_id')::uuid;
  IF own_world IS NULL THEN
    EXECUTE format('SELECT world_id FROM %s WHERE id=$1', TG_ARGV[2])
    INTO STRICT own_world USING (to_jsonb(NEW)->>TG_ARGV[3])::uuid;
  END IF;
  EXECUTE format('SELECT world_id FROM %s WHERE id=$1', TG_ARGV[1]) INTO STRICT reference_world USING reference_id;
  IF own_world IS DISTINCT FROM reference_world THEN RAISE EXCEPTION 'cross-world reference forbidden'; END IF;
  RETURN NEW;
END $$;

CREATE FUNCTION models.guard_run() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF OLD.status IN ('completed','failed') THEN RAISE EXCEPTION 'completed model run is immutable'; END IF;
  IF (to_jsonb(OLD)-ARRAY['status','completed_at','artifact_uri','diagnostics','error']) IS DISTINCT FROM
     (to_jsonb(NEW)-ARRAY['status','completed_at','artifact_uri','diagnostics','error']) THEN
    RAISE EXCEPTION 'model run inputs and configuration are immutable';
  END IF;
  IF NEW.status IN ('completed','failed') AND NEW.completed_at IS NULL THEN RAISE EXCEPTION 'completion timestamp required'; END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER guard_run BEFORE UPDATE ON models.model_run FOR EACH ROW EXECUTE FUNCTION models.guard_run();

CREATE FUNCTION belief.validate_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE run models.model_run; parent_world uuid; fact_world uuid; fact_class text; fact_quality text;
        identifier uuid; reference_table text; production boolean; allow_synthetic boolean;
BEGIN
  IF TG_TABLE_SCHEMA='models' THEN
    SELECT * INTO STRICT run FROM models.model_run WHERE id=NEW.model_run_id;
  ELSE
    SELECT r.* INTO STRICT run FROM models.model_run r JOIN belief.posterior_snapshot p ON p.model_run_id=r.id
      WHERE p.id=NEW.posterior_snapshot_id;
  END IF;
  IF run.status IN ('completed','failed') THEN RAISE EXCEPTION 'cannot append to sealed model lineage'; END IF;
  IF NEW.observation_id IS NOT NULL THEN reference_table := 'observations.observation'; identifier := NEW.observation_id;
  ELSIF NEW.assertion_id IS NOT NULL THEN reference_table := 'observations.assertion'; identifier := NEW.assertion_id;
  ELSE reference_table := 'geo.geometry_observation'; identifier := NEW.geometry_observation_id; END IF;
  EXECUTE format('SELECT world_id FROM %s WHERE id=$1', reference_table) INTO STRICT fact_world USING identifier;
  IF fact_world IS DISTINCT FROM run.world_id THEN RAISE EXCEPTION 'cross-world lineage forbidden'; END IF;
  SELECT kind='production', w.allow_synthetic INTO production, allow_synthetic FROM core.world w WHERE id=run.world_id;
  IF reference_table <> 'geo.geometry_observation' THEN
    EXECUTE format('SELECT epistemic_class,quality_status FROM %s WHERE id=$1', reference_table)
      INTO fact_class,fact_quality USING identifier;
    IF fact_quality='rejected' THEN RAISE EXCEPTION 'rejected evidence cannot enter inference'; END IF;
    IF production AND (fact_class='SCENARIO' OR (fact_class='SYNTHETIC' AND NOT allow_synthetic)) THEN
      RAISE EXCEPTION 'hypothetical evidence cannot enter production inference';
    END IF;
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_snapshot_lineage BEFORE INSERT ON belief.snapshot_input FOR EACH ROW EXECUTE FUNCTION belief.validate_lineage();
CREATE TRIGGER validate_run_lineage BEFORE INSERT ON models.run_input FOR EACH ROW EXECUTE FUNCTION belief.validate_lineage();

CREATE FUNCTION belief.require_lineage() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  IF EXISTS (SELECT 1 FROM belief.posterior_snapshot WHERE id=NEW.id)
     AND NOT EXISTS (SELECT 1 FROM belief.snapshot_input WHERE posterior_snapshot_id=NEW.id) THEN
    RAISE EXCEPTION 'posterior requires explicit evidence lineage';
  END IF;
  RETURN NULL;
END $$;
CREATE CONSTRAINT TRIGGER require_posterior_lineage AFTER INSERT ON belief.posterior_snapshot
  DEFERRABLE INITIALLY DEFERRED FOR EACH ROW EXECUTE FUNCTION belief.require_lineage();

CREATE FUNCTION market.validate_price() RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE fact jsonb; ref_table text; ref_id uuid;
BEGIN
  ref_table := CASE WHEN NEW.assertion_id IS NOT NULL THEN 'observations.assertion' ELSE 'observations.observation' END;
  ref_id := coalesce(NEW.assertion_id,NEW.observation_id);
  EXECUTE format('SELECT to_jsonb(t) FROM %s t WHERE id=$1',ref_table) INTO STRICT fact USING ref_id;
  IF NEW.amount IS DISTINCT FROM (fact->>'numeric_value')::numeric OR NEW.unit IS DISTINCT FROM fact->>'unit'
    OR NEW.source_id IS DISTINCT FROM (fact->>'source_id')::uuid OR NEW.evidence_item_id IS DISTINCT FROM (fact->>'evidence_item_id')::uuid
    OR NEW.world_id IS DISTINCT FROM (fact->>'world_id')::uuid OR NEW.subject_entity_id IS DISTINCT FROM (fact->>'subject_entity_id')::uuid THEN
    RAISE EXCEPTION 'price must match its source fact';
  END IF;
  RETURN NEW;
END $$;
CREATE TRIGGER validate_price BEFORE INSERT ON market.price_observation FOR EACH ROW EXECUTE FUNCTION market.validate_price();

-- Install immutable and audit policies from the frozen migration's table inventory.
DO $$
DECLARE row record; mode text;
BEGIN
  FOR row IN SELECT t.table_schema,t.table_name FROM information_schema.tables t
    WHERE t.table_type='BASE TABLE' AND t.table_schema IN ('core','geo','biology','forestry','market','operations','evidence','observations','belief','models','commercial','verification','decision','audit') LOOP
    IF EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema=row.table_schema AND c.table_name=row.table_name AND c.column_name='recorded_at')
       AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema=row.table_schema AND c.table_name=row.table_name AND c.column_name='superseded_at') THEN
      mode := 'temporal';
    ELSE mode := 'immutable'; END IF;
    IF row.table_schema IN ('evidence','observations','geo','biology')
      OR row.table_schema||'.'||row.table_name IN ('core.world','core.entity_alias','core.external_identity','models.model_version','models.parameter_definition','models.run_input','decision.decision','audit.change_event')
      OR mode='temporal' THEN
      EXECUTE format('CREATE TRIGGER history_guard BEFORE UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit.guard_history(%L)',row.table_schema,row.table_name,mode);
    ELSIF row.table_schema='belief' OR row.table_schema||'.'||row.table_name IN ('commercial.match_run','commercial.match_candidate') THEN
      EXECUTE format('CREATE TRIGGER history_guard BEFORE UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit.guard_history(%L)',row.table_schema,row.table_name,'immutable');
    END IF;
    IF row.table_schema <> 'audit' AND EXISTS (SELECT 1 FROM information_schema.columns c WHERE c.table_schema=row.table_schema AND c.table_name=row.table_name AND c.column_name='id') THEN
      EXECUTE format('CREATE TRIGGER audit_change AFTER INSERT OR UPDATE OR DELETE ON %I.%I FOR EACH ROW EXECUTE FUNCTION audit.record_change()',row.table_schema,row.table_name);
    END IF;
  END LOOP;
END $$;

DO $$
DECLARE row record;
BEGIN
  -- All world-bearing foreign keys get same-world integrity automatically.
  FOR row IN
    SELECT DISTINCT ns.nspname AS table_schema,t.relname AS table_name,a.attname AS column_name,
      pns.nspname AS parent_schema,pt.relname AS parent_table
    FROM pg_constraint c JOIN pg_class t ON t.oid=c.conrelid JOIN pg_namespace ns ON ns.oid=t.relnamespace
    JOIN pg_class pt ON pt.oid=c.confrelid JOIN pg_namespace pns ON pns.oid=pt.relnamespace
    CROSS JOIN LATERAL generate_subscripts(c.conkey,1) i
    JOIN pg_attribute a ON a.attrelid=t.oid AND a.attnum=c.conkey[i]
    JOIN pg_attribute pa ON pa.attrelid=pt.oid AND pa.attnum=c.confkey[i]
    WHERE c.contype='f' AND pa.attname='id' AND a.attname <> 'world_id'
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=t.oid AND attname='world_id')
      AND EXISTS(SELECT 1 FROM pg_attribute WHERE attrelid=pt.oid AND attname='world_id')
  LOOP
    EXECUTE format('CREATE TRIGGER %I BEFORE INSERT OR UPDATE ON %I.%I FOR EACH ROW EXECUTE FUNCTION core.check_world_reference(%L,%L)',
      'world_'||row.column_name||'_'||row.parent_table, row.table_schema,row.table_name,row.column_name,row.parent_schema||'.'||row.parent_table);
  END LOOP;
END $$;

CREATE VIEW geo.latest_entity_geometry AS
 SELECT DISTINCT ON (entity_id,world_id) * FROM geo.geometry_observation
 WHERE knowledge_period @> clock_timestamp() AND valid_period @> clock_timestamp() AND method <> 'display_offset'
 ORDER BY entity_id,world_id,recorded_at DESC,id;
CREATE VIEW belief.current_asset_state AS
 SELECT DISTINCT ON (entity_id,world_id,state_type) * FROM belief.state_snapshot
 WHERE as_of <= clock_timestamp() ORDER BY entity_id,world_id,state_type,as_of DESC,known_at DESC,created_at DESC,id;
CREATE VIEW market.latest_price AS
 SELECT DISTINCT ON (p.subject_entity_id,p.world_id,p.unit,p.basis) p.* FROM market.price_observation p
 LEFT JOIN observations.assertion a ON a.id=p.assertion_id
 LEFT JOIN observations.observation o ON o.id=p.observation_id
 WHERE coalesce(a.knowledge_period,o.knowledge_period) @> clock_timestamp()
   AND coalesce(a.valid_period,o.valid_period) @> clock_timestamp()
 ORDER BY p.subject_entity_id,p.world_id,p.unit,p.basis,coalesce(a.recorded_at,o.recorded_at) DESC,p.id;
CREATE VIEW market.latest_processor_specification AS
 SELECT DISTINCT ON (p.grade_definition_id,p.world_id) p.* FROM market.processor_specification p
 LEFT JOIN observations.assertion a ON a.id=p.assertion_id
 LEFT JOIN observations.observation o ON o.id=p.observation_id
 WHERE coalesce(a.knowledge_period,o.knowledge_period) @> clock_timestamp()
   AND coalesce(a.valid_period,o.valid_period) @> clock_timestamp()
 ORDER BY p.grade_definition_id,p.world_id,coalesce(a.recorded_at,o.recorded_at) DESC,p.id;

CREATE FUNCTION geo.validate_source_world() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM core.world WHERE id=NEW.world_id AND kind='production' AND NOT allow_synthetic)
   AND EXISTS (SELECT 1 FROM evidence.evidence_item e JOIN evidence.source s ON s.id=e.source_id
       WHERE e.id=NEW.evidence_item_id AND (s.data_class='SYNTHETIC' OR e.data_class='SYNTHETIC')) THEN
   RAISE EXCEPTION 'synthetic geometry forbidden in production';
 END IF;
 RETURN NEW;
END $$;
CREATE TRIGGER validate_geometry_source BEFORE INSERT ON geo.geometry_observation FOR EACH ROW EXECUTE FUNCTION geo.validate_source_world();

-- Child objects without their own world inherit it from their parent.
CREATE TRIGGER world_job_fact BEFORE INSERT OR UPDATE ON operations.job_observation FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('observation_id','observations.observation','operations.job','job_id');
CREATE TRIGGER world_verification_result BEFORE INSERT OR UPDATE ON verification.result FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('observation_id','observations.observation','verification.task','task_id');
CREATE TRIGGER world_route_distance BEFORE INSERT OR UPDATE ON operations.route_leg FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('distance_observation_id','observations.observation','operations.route','route_id');
CREATE TRIGGER world_route_payload BEFORE INSERT OR UPDATE ON operations.route_leg FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('payload_observation_id','observations.observation','operations.route','route_id');
CREATE TRIGGER world_route_time BEFORE INSERT OR UPDATE ON operations.route_leg FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('travel_time_observation_id','observations.observation','operations.route','route_id');
CREATE TRIGGER world_route_cost BEFORE INSERT OR UPDATE ON operations.route_leg FOR EACH ROW
 EXECUTE FUNCTION core.check_world_reference('cost_observation_id','observations.observation','operations.route','route_id');

-- A sealed posterior's lineage can only be removed by deleting the posterior itself.
CREATE FUNCTION belief.guard_lineage_delete() RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
 IF EXISTS (SELECT 1 FROM belief.posterior_snapshot WHERE id=OLD.posterior_snapshot_id) THEN
   RAISE EXCEPTION 'sealed lineage: delete the derived posterior bundle, not individual inputs';
 END IF;
 RETURN OLD;
END $$;
CREATE TRIGGER guard_lineage_delete BEFORE DELETE ON belief.snapshot_input FOR EACH ROW EXECUTE FUNCTION belief.guard_lineage_delete();
