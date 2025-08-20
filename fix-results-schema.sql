-- Fix for results feature - work with existing sample_tests architecture
-- Instead of adding analysis_type to samples, use the existing test_catalog.area

-- 1. Add missing fields to results table to link with specific sample_tests
ALTER TABLE results ADD COLUMN IF NOT EXISTS sample_test_id uuid;
ALTER TABLE results ADD CONSTRAINT results_sample_test_id_fkey 
  FOREIGN KEY (sample_test_id) REFERENCES sample_tests(id);

-- 2. Add test type info to results (derived from test_catalog)
ALTER TABLE results ADD COLUMN IF NOT EXISTS test_area text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS methodology text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS findings jsonb;
ALTER TABLE results ADD COLUMN IF NOT EXISTS pathogen_identified text;
ALTER TABLE results ADD COLUMN IF NOT EXISTS pathogen_type text CHECK (
  pathogen_type = ANY (ARRAY['fungus'::text, 'bacteria'::text, 'virus'::text, 'nematode'::text, 'insect'::text, 'abiotic'::text, 'unknown'::text])
);
ALTER TABLE results ADD COLUMN IF NOT EXISTS severity text CHECK (
  severity = ANY (ARRAY['low'::text, 'moderate'::text, 'high'::text, 'severe'::text])
);
ALTER TABLE results ADD COLUMN IF NOT EXISTS confidence text CHECK (
  confidence = ANY (ARRAY['low'::text, 'medium'::text, 'high'::text])
);
ALTER TABLE results ADD COLUMN IF NOT EXISTS result_type text CHECK (
  result_type = ANY (ARRAY['positive'::text, 'negative'::text, 'inconclusive'::text])
);

-- 3. Function to auto-populate test_area when creating results
CREATE OR REPLACE FUNCTION set_result_test_area()
RETURNS TRIGGER AS $$
DECLARE
  test_area_val text;
BEGIN
  -- Get the test area from the linked sample_test
  SELECT tc.area INTO test_area_val
  FROM sample_tests st
  JOIN test_catalog tc ON st.test_id = tc.id
  WHERE st.id = NEW.sample_test_id;
  
  IF test_area_val IS NULL THEN
    RAISE EXCEPTION 'Cannot find test area for sample_test_id %', NEW.sample_test_id;
  END IF;
  
  NEW.test_area := test_area_val;
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- 4. Trigger to automatically set test_area
DROP TRIGGER IF EXISTS trg_results_set_test_area ON results;
CREATE TRIGGER trg_results_set_test_area
  BEFORE INSERT OR UPDATE ON results
  FOR EACH ROW 
  WHEN (NEW.sample_test_id IS NOT NULL)
  EXECUTE FUNCTION set_result_test_area();

-- 5. Add constraint to ensure results are linked to sample_tests
ALTER TABLE results DROP CONSTRAINT IF EXISTS results_must_have_sample_test;
ALTER TABLE results ADD CONSTRAINT results_must_have_sample_test 
  CHECK (sample_test_id IS NOT NULL);

-- 6. Add index for better performance
CREATE INDEX IF NOT EXISTS idx_results_sample_test_id ON results(sample_test_id);
CREATE INDEX IF NOT EXISTS idx_results_test_area ON results(test_area);

-- 7. Update reports table to work with multiple test areas per sample
ALTER TABLE reports ADD COLUMN IF NOT EXISTS test_areas text[] DEFAULT '{}';

-- 8. Function to update report test_areas based on sample's test results
CREATE OR REPLACE FUNCTION update_report_test_areas()
RETURNS TRIGGER AS $$
BEGIN
  -- Update the report's test_areas based on all results for this sample
  UPDATE reports 
  SET test_areas = (
    SELECT ARRAY_AGG(DISTINCT r.test_area)
    FROM results r
    WHERE r.sample_id = NEW.sample_id
    AND r.test_area IS NOT NULL
  )
  WHERE sample_id = NEW.sample_id;
  
  RETURN NEW;
END; $$ LANGUAGE plpgsql;

-- 9. Trigger to update report test_areas when results are added/updated
DROP TRIGGER IF EXISTS trg_update_report_test_areas ON results;
CREATE TRIGGER trg_update_report_test_areas
  AFTER INSERT OR UPDATE OR DELETE ON results
  FOR EACH ROW 
  EXECUTE FUNCTION update_report_test_areas();