-- 028: Migra todos los datos existentes a la vertical plagas_patogenos.
-- Esta migración asegura compatibilidad backward con el sistema actual.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Obtener el ID de la vertical plagas_patogenos
-- ══════════════════════════════════════════════════════════════════════════════
DO $$
DECLARE
  plagas_vertical_id uuid;
BEGIN
  -- Obtener ID de la vertical plagas_patogenos
  SELECT id INTO plagas_vertical_id
  FROM public.verticals
  WHERE key = 'plagas_patogenos';

  IF plagas_vertical_id IS NULL THEN
    RAISE EXCEPTION 'Vertical plagas_patogenos no encontrada. Ejecute primero 025_create_verticals_table.sql';
  END IF;

  -- ════════════════════════════════════════════════════════════════════════════
  -- 2. Asignar vertical_id a analysis_types existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.analysis_types
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'analysis_types actualizados: %', (SELECT COUNT(*) FROM public.analysis_types WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 3. Asignar vertical_id a analytes existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.analytes
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'analytes actualizados: %', (SELECT COUNT(*) FROM public.analytes WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 4. Asignar vertical_id a test_catalog existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.test_catalog
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'test_catalog actualizados: %', (SELECT COUNT(*) FROM public.test_catalog WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 5. Asignar vertical_id a methods existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.methods
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'methods actualizados: %', (SELECT COUNT(*) FROM public.methods WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 6. Asignar vertical_id a interpretation_rules existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.interpretation_rules
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'interpretation_rules actualizados: %', (SELECT COUNT(*) FROM public.interpretation_rules WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 7. Asignar vertical_id a sla_policies existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.sla_policies
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'sla_policies actualizados: %', (SELECT COUNT(*) FROM public.sla_policies WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 8. Asignar vertical_id a samples existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.samples
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'samples actualizados: %', (SELECT COUNT(*) FROM public.samples WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 9. Asignar vertical_id a reports existentes
  -- ════════════════════════════════════════════════════════════════════════════
  UPDATE public.reports
  SET vertical_id = plagas_vertical_id
  WHERE vertical_id IS NULL;

  RAISE NOTICE 'reports actualizados: %', (SELECT COUNT(*) FROM public.reports WHERE vertical_id = plagas_vertical_id);

  -- ════════════════════════════════════════════════════════════════════════════
  -- 10. Asociar todas las companies existentes a la vertical plagas_patogenos
  -- ════════════════════════════════════════════════════════════════════════════
  INSERT INTO public.company_verticals (company_id, vertical_id, active, is_primary)
  SELECT 
    c.id,
    plagas_vertical_id,
    true,
    true  -- Marcar como vertical primaria
  FROM public.companies c
  WHERE NOT EXISTS (
    SELECT 1 FROM public.company_verticals cv
    WHERE cv.company_id = c.id
    AND cv.vertical_id = plagas_vertical_id
  );

  RAISE NOTICE 'companies asociadas a plagas_patogenos: %', (SELECT COUNT(*) FROM public.company_verticals WHERE vertical_id = plagas_vertical_id);

END $$;

-- ══════════════════════════════════════════════════════════════════════════════
-- 11. Crear función helper para obtener vertical_id por defecto
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_default_vertical_id()
RETURNS uuid AS $$
  SELECT id FROM public.verticals WHERE key = 'plagas_patogenos' LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 12. Crear función para obtener vertical primaria de una company
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION get_company_primary_vertical(p_company_id uuid)
RETURNS uuid AS $$
  SELECT cv.vertical_id 
  FROM public.company_verticals cv
  WHERE cv.company_id = p_company_id
  AND cv.is_primary = true
  AND cv.active = true
  LIMIT 1;
$$ LANGUAGE sql STABLE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 13. Crear función para verificar si una company tiene acceso a una vertical
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION company_has_vertical_access(p_company_id uuid, p_vertical_id uuid)
RETURNS boolean AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.company_verticals cv
    WHERE cv.company_id = p_company_id
    AND cv.vertical_id = p_vertical_id
    AND cv.active = true
  );
$$ LANGUAGE sql STABLE;

-- ══════════════════════════════════════════════════════════════════════════════
-- 14. Crear vista para facilitar queries de catálogos con vertical
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE VIEW public.v_analysis_types_with_vertical AS
SELECT 
  at.*,
  v.key as vertical_key,
  v.label as vertical_label
FROM public.analysis_types at
LEFT JOIN public.verticals v ON at.vertical_id = v.id;

GRANT SELECT ON public.v_analysis_types_with_vertical TO authenticated;
