-- 035: Limpieza operativa de un laboratorio de suelo, solo por CSX.
-- Borra muestras, resultados e informes de suelo de una company cuya
-- vertical primaria activa es suelo. No toca samples, results, reports
-- ni el catálogo soil_analyses. is_csx() ya existe (009).

CREATE OR REPLACE FUNCTION public.assert_csx_primary_soil_company(p_company_id uuid)
RETURNS void
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  IF p_company_id IS NULL OR NOT EXISTS (
    SELECT 1
    FROM public.companies
    WHERE id = p_company_id
  ) THEN
    RAISE EXCEPTION 'company not found'
      USING ERRCODE = 'P0002';
  END IF;

  IF NOT EXISTS (
    SELECT 1
    FROM public.company_verticals cv
    JOIN public.verticals v ON v.id = cv.vertical_id
    WHERE cv.company_id = p_company_id
      AND cv.active
      AND cv.is_primary
      AND v.key = 'suelo'
  ) THEN
    RAISE EXCEPTION 'not a soil company'
      USING ERRCODE = '42501';
  END IF;
END;
$$;

REVOKE ALL ON FUNCTION public.assert_csx_primary_soil_company(uuid) FROM PUBLIC, anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.csx_company_operational_counts(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sample_count bigint;
  result_count bigint;
  report_count bigint;
BEGIN
  PERFORM public.assert_csx_primary_soil_company(p_company_id);

  SELECT count(*)
  INTO sample_count
  FROM public.soil_samples
  WHERE company_id = p_company_id;

  SELECT count(*)
  INTO result_count
  FROM public.soil_results results
  JOIN public.soil_subsamples subsamples ON subsamples.id = results.subsample_id
  JOIN public.soil_samples samples ON samples.id = subsamples.sample_id
  WHERE samples.company_id = p_company_id;

  SELECT count(*)
  INTO report_count
  FROM public.soil_reports
  WHERE company_id = p_company_id;

  RETURN jsonb_build_object(
    'soil_samples', sample_count,
    'soil_results', result_count,
    'soil_reports', report_count
  );
END;
$$;

REVOKE ALL ON FUNCTION public.csx_company_operational_counts(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.csx_company_operational_counts(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.csx_purge_company_operational_data(p_company_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  counts jsonb;
  storage_paths jsonb;
BEGIN
  PERFORM public.assert_csx_primary_soil_company(p_company_id);

  counts := public.csx_company_operational_counts(p_company_id);

  SELECT COALESCE(jsonb_agg(imports.storage_path ORDER BY imports.created_at), '[]'::jsonb)
  INTO storage_paths
  FROM public.soil_result_imports imports
  WHERE imports.company_id = p_company_id
    AND imports.storage_path IS NOT NULL
    AND btrim(imports.storage_path) <> '';

  DELETE FROM public.soil_reports
  WHERE company_id = p_company_id;

  DELETE FROM public.soil_samples
  WHERE company_id = p_company_id;

  DELETE FROM public.soil_result_imports
  WHERE company_id = p_company_id;

  RETURN counts || jsonb_build_object('storage_paths', storage_paths);
END;
$$;

REVOKE ALL ON FUNCTION public.csx_purge_company_operational_data(uuid) FROM PUBLIC, anon, service_role;
GRANT EXECUTE ON FUNCTION public.csx_purge_company_operational_data(uuid) TO authenticated;
