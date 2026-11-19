-- El informe guarda la matriz y el payload. El resultado no tiene matriz.

CREATE TABLE IF NOT EXISTS public.soil_reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  matrix_id uuid NOT NULL REFERENCES public.soil_matrices(id) ON DELETE RESTRICT,
  payload jsonb NOT NULL,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS soil_reports_company_created_idx
  ON public.soil_reports (company_id, created_at DESC);

CREATE TABLE IF NOT EXISTS public.soil_report_samples (
  report_id uuid NOT NULL REFERENCES public.soil_reports(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.soil_samples(id) ON DELETE CASCADE,
  PRIMARY KEY (report_id, sample_id)
);

CREATE OR REPLACE FUNCTION public.soil_report_company_id(p_report_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.soil_reports WHERE id = p_report_id;
$$;

REVOKE ALL ON FUNCTION public.soil_report_company_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soil_report_company_id(uuid) TO authenticated;

ALTER TABLE public.soil_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_report_samples ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Soil lab manages company reports" ON public.soil_reports;
DROP POLICY IF EXISTS "CSX support reads soil reports" ON public.soil_reports;
CREATE POLICY "Soil lab manages company reports"
  ON public.soil_reports FOR ALL TO authenticated
  USING (can_operate_soil_company(company_id))
  WITH CHECK (can_operate_soil_company(company_id));
CREATE POLICY "CSX support reads soil reports"
  ON public.soil_reports FOR SELECT TO authenticated
  USING (is_csx());

DROP POLICY IF EXISTS "Soil lab manages report samples" ON public.soil_report_samples;
DROP POLICY IF EXISTS "CSX support reads report samples" ON public.soil_report_samples;
CREATE POLICY "Soil lab manages report samples"
  ON public.soil_report_samples FOR ALL TO authenticated
  USING (can_operate_soil_company(soil_report_company_id(report_id)))
  WITH CHECK (can_operate_soil_company(soil_report_company_id(report_id)));
CREATE POLICY "CSX support reads report samples"
  ON public.soil_report_samples FOR SELECT TO authenticated
  USING (is_csx());

GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.soil_reports,
  public.soil_report_samples
TO authenticated;
