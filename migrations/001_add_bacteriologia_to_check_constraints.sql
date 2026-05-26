-- 001: Agrega 'bacteriologia' a los CHECK constraints de area en 3 tablas.
-- El tipo AreaType en TypeScript ya incluye 'bacteriologia', pero la BD fisica no.
-- El backup er_schema_complete.sql ya tiene 'bacteriologia' en test_catalog.area,
-- por lo que esa tabla posiblemente ya este corregida en produccion.

-- test_catalog.area
ALTER TABLE public.test_catalog
  DROP CONSTRAINT IF EXISTS test_catalog_area_check;
ALTER TABLE public.test_catalog
  ADD CONSTRAINT test_catalog_area_check
  CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'bacteriologia'::text, 'deteccion_precoz'::text]));

-- interpretation_rules.area
ALTER TABLE public.interpretation_rules
  DROP CONSTRAINT IF EXISTS interpretation_rules_area_check;
ALTER TABLE public.interpretation_rules
  ADD CONSTRAINT interpretation_rules_area_check
  CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'bacteriologia'::text, 'deteccion_precoz'::text]));

-- sla_policies.area
ALTER TABLE public.sla_policies
  DROP CONSTRAINT IF EXISTS sla_policies_area_check;
ALTER TABLE public.sla_policies
  ADD CONSTRAINT sla_policies_area_check
  CHECK (area = ANY (ARRAY['nematologia'::text, 'fitopatologia'::text, 'virologia'::text, 'bacteriologia'::text, 'deteccion_precoz'::text]));
