-- 023: agrega samples.by_type e reports.by_type a csx_company_usage_stats.
-- CREATE OR REPLACE de la misma función que 021 (versión actual).
-- Si 021 aún no se aplicó, corre 021 (ya incluye by_type) y omite este archivo.
-- Si 021 ya estaba aplicada, corre solo este archivo.

CREATE OR REPLACE FUNCTION public.csx_company_usage_stats(
  p_company_id uuid,
  p_this_start timestamptz,
  p_this_end timestamptz,
  p_month_count integer DEFAULT 6
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  company_name text;
  last_start timestamptz;
  month_count integer;
  samples_by_month jsonb;
  reports_by_month jsonb;
  samples_by_type jsonb;
  reports_by_type jsonb;
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  SELECT c.name INTO company_name
  FROM public.companies c
  WHERE c.id = p_company_id;

  IF company_name IS NULL THEN
    RAISE EXCEPTION 'Compañía no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  month_count := GREATEST(COALESCE(p_month_count, 6), 2);
  last_start := p_this_start - make_interval(months => 1);

  SELECT COALESCE(jsonb_agg(row_to_json(bucket) ORDER BY bucket.month_start), '[]'::jsonb)
  INTO samples_by_month
  FROM (
    SELECT
      gs.month_start,
      gs.month_start + interval '1 month' AS month_end,
      (
        SELECT count(*)::int
        FROM public.samples s
        WHERE s.company_id = p_company_id
          AND s.created_at >= gs.month_start
          AND s.created_at < gs.month_start + interval '1 month'
      ) AS count
    FROM generate_series(
      p_this_start - make_interval(months => month_count - 1),
      p_this_start,
      interval '1 month'
    ) AS gs(month_start)
  ) bucket;

  SELECT COALESCE(jsonb_agg(row_to_json(bucket) ORDER BY bucket.month_start), '[]'::jsonb)
  INTO reports_by_month
  FROM (
    SELECT
      gs.month_start,
      gs.month_start + interval '1 month' AS month_end,
      (
        SELECT count(*)::int
        FROM public.reports r
        WHERE r.company_id = p_company_id
          AND r.created_at >= gs.month_start
          AND r.created_at < gs.month_start + interval '1 month'
      ) AS count
    FROM generate_series(
      p_this_start - make_interval(months => month_count - 1),
      p_this_start,
      interval '1 month'
    ) AS gs(month_start)
  ) bucket;

  SELECT COALESCE(jsonb_agg(row_to_json(bucket) ORDER BY bucket.count DESC, bucket.type_key), '[]'::jsonb)
  INTO samples_by_type
  FROM (
    SELECT
      COALESCE(NULLIF(btrim(tc.area), ''), '') AS type_key,
      count(DISTINCT s.id)::int AS count
    FROM public.samples s
    LEFT JOIN public.sample_tests st ON st.sample_id = s.id
    LEFT JOIN public.test_catalog tc ON tc.id = st.test_id
    WHERE s.company_id = p_company_id
    GROUP BY COALESCE(NULLIF(btrim(tc.area), ''), '')
  ) bucket;

  SELECT COALESCE(jsonb_agg(row_to_json(bucket) ORDER BY bucket.count DESC, bucket.type_key), '[]'::jsonb)
  INTO reports_by_type
  FROM (
    SELECT
      COALESCE(NULLIF(btrim(area), ''), '') AS type_key,
      count(*)::int AS count
    FROM public.reports r
    CROSS JOIN LATERAL unnest(
      CASE
        WHEN r.test_areas IS NOT NULL AND cardinality(r.test_areas) > 0 THEN r.test_areas
        ELSE ARRAY[COALESCE(r.analysis_type, '')]
      END
    ) AS area
    WHERE r.company_id = p_company_id
    GROUP BY COALESCE(NULLIF(btrim(area), ''), '')
  ) bucket;

  RETURN jsonb_build_object(
    'company_id', p_company_id,
    'company_name', company_name,
    'clients_total', (
      SELECT count(*)::int FROM public.clients cl WHERE cl.company_id = p_company_id
    ),
    'samples', jsonb_build_object(
      'total', (SELECT count(*)::int FROM public.samples s WHERE s.company_id = p_company_id),
      'this_month', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id
          AND s.created_at >= p_this_start AND s.created_at < p_this_end
      ),
      'last_month', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id
          AND s.created_at >= last_start AND s.created_at < p_this_start
      ),
      'received', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id AND s.status = 'received'
      ),
      'processing', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id
          AND s.status IN (
            'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis'
          )
      ),
      'validation', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id AND s.status = 'validation'
      ),
      'completed', (
        SELECT count(*)::int FROM public.samples s
        WHERE s.company_id = p_company_id AND s.status = 'completed'
      ),
      'by_month', samples_by_month,
      'by_type', samples_by_type
    ),
    'reports', jsonb_build_object(
      'total', (SELECT count(*)::int FROM public.reports r WHERE r.company_id = p_company_id),
      'this_month', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id
          AND r.created_at >= p_this_start AND r.created_at < p_this_end
      ),
      'last_month', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id
          AND r.created_at >= last_start AND r.created_at < p_this_start
      ),
      'completed_total', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id AND r.completed = true
      ),
      'completed_this_month', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id
          AND r.completed = true
          AND r.created_at >= p_this_start AND r.created_at < p_this_end
      ),
      'draft', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id AND r.status = 'draft'
      ),
      'generated', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id AND r.status = 'generated'
      ),
      'sent', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id AND r.status = 'sent'
      ),
      'validated', (
        SELECT count(*)::int FROM public.reports r
        WHERE r.company_id = p_company_id AND r.status = 'validated'
      ),
      'by_month', reports_by_month,
      'by_type', reports_by_type
    )
  );
END;
$$;

REVOKE ALL ON FUNCTION public.csx_company_usage_stats(uuid, timestamptz, timestamptz, integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.csx_company_usage_stats(uuid, timestamptz, timestamptz, integer) TO authenticated;
