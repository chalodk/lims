-- 018: findings_normalized — proyección tabular de results.findings para dashboard.
-- is_sag_zero_tolerance se marca por patógeno en el JSON y se copia aquí al guardar.

CREATE TABLE IF NOT EXISTS public.findings_normalized (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  result_id uuid NOT NULL REFERENCES public.results(id) ON DELETE CASCADE,
  sample_id uuid NOT NULL REFERENCES public.samples(id) ON DELETE CASCADE,
  test_area text,
  findings_type text,
  source_kind text NOT NULL CHECK (source_kind IN ('nematode', 'test')),
  source_index integer NOT NULL,
  pathogen_name text NOT NULL,
  quantity text,
  quantity_numeric numeric,
  detection_result text,
  is_sag_zero_tolerance boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (result_id, source_kind, source_index)
);

CREATE INDEX IF NOT EXISTS idx_findings_normalized_sample_id
  ON public.findings_normalized (sample_id);

CREATE INDEX IF NOT EXISTS idx_findings_normalized_result_id
  ON public.findings_normalized (result_id);

CREATE INDEX IF NOT EXISTS idx_findings_normalized_pathogen
  ON public.findings_normalized (pathogen_name);

CREATE INDEX IF NOT EXISTS idx_findings_normalized_sag_zero
  ON public.findings_normalized (is_sag_zero_tolerance)
  WHERE is_sag_zero_tolerance = true;

COMMENT ON TABLE public.findings_normalized IS 'Filas normalizadas desde results.findings (una por patógeno/detección)';
COMMENT ON COLUMN public.findings_normalized.is_sag_zero_tolerance IS 'Marcado por el validador: patógeno con tolerancia cero SAG';
COMMENT ON COLUMN public.findings_normalized.source_kind IS 'Origen en JSON: nematodes[] o tests[]';
COMMENT ON COLUMN public.findings_normalized.source_index IS 'Índice del ítem en el array findings';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.findings_normalized TO authenticated;

ALTER TABLE public.findings_normalized ENABLE ROW LEVEL SECURITY;

-- Lectura: misma company que el sample, o admin
DROP POLICY IF EXISTS "Users can view findings_normalized for their company samples" ON public.findings_normalized;
CREATE POLICY "Users can view findings_normalized for their company samples"
  ON public.findings_normalized FOR SELECT
  TO authenticated
  USING (
    sample_id IN (
      SELECT id FROM public.samples WHERE company_id = get_user_company_id()
    )
    OR is_admin()
  );

-- Lectura consumidor: samples de su client_id
DROP POLICY IF EXISTS "Consumers can view findings_normalized for their client samples" ON public.findings_normalized;
CREATE POLICY "Consumers can view findings_normalized for their client samples"
  ON public.findings_normalized FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples WHERE client_id = get_user_client_id()
    )
  );

-- Escritura lab
DROP POLICY IF EXISTS "Lab users can insert findings_normalized" ON public.findings_normalized;
CREATE POLICY "Lab users can insert findings_normalized"
  ON public.findings_normalized FOR INSERT
  TO authenticated
  WITH CHECK (
    is_lab_user()
    AND sample_id IN (
      SELECT id FROM public.samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can update findings_normalized" ON public.findings_normalized;
CREATE POLICY "Lab users can update findings_normalized"
  ON public.findings_normalized FOR UPDATE
  TO authenticated
  USING (
    is_lab_user()
    AND sample_id IN (
      SELECT id FROM public.samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete findings_normalized" ON public.findings_normalized;
CREATE POLICY "Lab users can delete findings_normalized"
  ON public.findings_normalized FOR DELETE
  TO authenticated
  USING (
    is_lab_user()
    AND sample_id IN (
      SELECT id FROM public.samples WHERE company_id = get_user_company_id()
    )
  );
