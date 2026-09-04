-- 024: RPC csx_billing_companies_usage para /admin/billing.
-- SECURITY DEFINER + is_csx() OR is_admin().
-- No usa service role (en este proyecto da 42501 permission denied for schema public)
-- y no reabre SELECT de samples/clients a CSX.
-- Idempotente.

CREATE OR REPLACE FUNCTION public.csx_billing_companies_usage(
  p_this_start timestamptz,
  p_this_end timestamptz,
  p_company_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT (is_csx() OR is_admin()) THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(row_to_json(bucket) ORDER BY bucket.name)
    FROM (
      SELECT
        c.id,
        c.name,
        c.plan_tier,
        c.billing_notes,
        c.plan_updated_at,
        c.trial_started_at,
        c.trial_ends_at,
        (
          SELECT count(*)::int
          FROM public.samples s
          WHERE s.company_id = c.id
            AND s.created_at >= p_this_start
            AND s.created_at < p_this_end
        ) AS samples_this_month,
        (
          SELECT count(*)::int
          FROM public.clients cl
          WHERE cl.company_id = c.id
        ) AS client_count
      FROM public.companies c
      WHERE p_company_id IS NULL OR c.id = p_company_id
    ) bucket
  ), '[]'::jsonb);
END;
$$;

REVOKE ALL ON FUNCTION public.csx_billing_companies_usage(timestamptz, timestamptz, uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.csx_billing_companies_usage(timestamptz, timestamptz, uuid) TO authenticated;
