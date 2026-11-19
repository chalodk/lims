-- 028: Módulo de suelo. Tablas propias; no toca samples/results/reports de plagas.
-- Muestra = columna A del Excel del laboratorio, submuestra = columna B.
-- Acceso: company del usuario con la vertical 'suelo' activa (027). CSX lee para soporte.
-- Requiere 027. Idempotente.
--
-- Probar: un usuario de una company de suelo crea una muestra y ve sus submuestras;
-- un usuario de Nemachile no ve filas de soil_*; pedir un análisis que no aplica a la
-- matriz de la muestra falla.

CREATE TABLE IF NOT EXISTS public.soil_matrices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL
);

INSERT INTO public.soil_matrices (key, name) VALUES
  ('suelo', 'Suelo'),
  ('compost', 'Compost'),
  ('agua', 'Agua'),
  ('liquido', 'Líquido'),
  ('fertilizante', 'Fertilizante'),
  ('foliar', 'Foliar'),
  ('fruto', 'Fruto'),
  ('raices', 'Raíces'),
  ('raquis', 'Raquis'),
  ('digestato', 'Digestato'),
  ('hongos', 'Hongos'),
  ('tejido_vegetal', 'Tejido vegetal')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.soil_analyses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  analysis_key text NOT NULL,
  report_title text NOT NULL,
  unit text,
  result_kind text NOT NULL DEFAULT 'numeric' CHECK (result_kind IN ('numeric', 'text')),
  method_label text,
  excel_sheet text,
  excel_value_column text CHECK (excel_value_column ~ '^[A-Z]{1,3}$'),
  excel_discriminator_column text CHECK (excel_discriminator_column ~ '^[A-Z]{1,3}$'),
  excel_discriminator_value text,
  excel_unit_column text CHECK (excel_unit_column ~ '^[A-Z]{1,3}$'),
  -- NULL: la pestaña no tiene submuestra (se informa como submuestra 1).
  excel_subsample_column text DEFAULT 'B' CHECK (excel_subsample_column ~ '^[A-Z]{1,3}$'),
  active boolean NOT NULL DEFAULT true,
  pending_note text,
  sort_order integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, analysis_key),
  CHECK (NOT active OR (excel_sheet IS NOT NULL AND excel_value_column IS NOT NULL)),
  CHECK ((excel_discriminator_column IS NULL) = (excel_discriminator_value IS NULL))
);

CREATE TABLE IF NOT EXISTS public.soil_analysis_matrices (
  analysis_id uuid NOT NULL REFERENCES public.soil_analyses(id) ON DELETE CASCADE,
  matrix_id uuid NOT NULL REFERENCES public.soil_matrices(id) ON DELETE RESTRICT,
  PRIMARY KEY (analysis_id, matrix_id)
);

CREATE TABLE IF NOT EXISTS public.soil_samples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  client_id uuid NOT NULL REFERENCES public.clients(id) ON DELETE RESTRICT,
  code text NOT NULL CHECK (btrim(code) <> ''),
  matrix_id uuid NOT NULL REFERENCES public.soil_matrices(id) ON DELETE RESTRICT,
  received_at date NOT NULL DEFAULT current_date,
  status text NOT NULL DEFAULT 'received' CHECK (status IN ('received', 'in_analysis', 'completed')),
  notes text,
  attributes jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, code)
);

CREATE INDEX IF NOT EXISTS soil_samples_company_received_idx
  ON public.soil_samples (company_id, received_at DESC);

CREATE TABLE IF NOT EXISTS public.soil_subsamples (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  sample_id uuid NOT NULL REFERENCES public.soil_samples(id) ON DELETE CASCADE,
  number integer NOT NULL CHECK (number > 0),
  UNIQUE (sample_id, number)
);

CREATE TABLE IF NOT EXISTS public.soil_sample_analyses (
  sample_id uuid NOT NULL REFERENCES public.soil_samples(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.soil_analyses(id) ON DELETE RESTRICT,
  PRIMARY KEY (sample_id, analysis_id)
);

CREATE TABLE IF NOT EXISTS public.soil_result_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  file_name text NOT NULL,
  storage_path text,
  uploaded_by uuid REFERENCES public.users(id) ON DELETE SET NULL,
  summary jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.soil_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subsample_id uuid NOT NULL REFERENCES public.soil_subsamples(id) ON DELETE CASCADE,
  analysis_id uuid NOT NULL REFERENCES public.soil_analyses(id) ON DELETE RESTRICT,
  value_numeric double precision,
  value_qualifier text CHECK (value_qualifier IN ('<', '>', 'ND')),
  value_text text,
  raw_value text NOT NULL,
  unit text,
  basis text,
  import_id uuid REFERENCES public.soil_result_imports(id) ON DELETE SET NULL,
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (subsample_id, analysis_id),
  CHECK (value_numeric IS NOT NULL OR value_text IS NOT NULL OR value_qualifier = 'ND')
);

-- Un análisis solo se puede pedir si aplica a la matriz de la muestra y es de la misma company.
CREATE OR REPLACE FUNCTION public.enforce_soil_sample_analysis_matrix()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM public.soil_samples s
    JOIN public.soil_analyses a ON a.id = NEW.analysis_id AND a.company_id = s.company_id
    JOIN public.soil_analysis_matrices am ON am.analysis_id = a.id AND am.matrix_id = s.matrix_id
    WHERE s.id = NEW.sample_id
  ) THEN
    RAISE EXCEPTION 'El análisis no aplica a la matriz de la muestra'
      USING ERRCODE = '23514';
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS soil_sample_analyses_matrix_check ON public.soil_sample_analyses;
CREATE TRIGGER soil_sample_analyses_matrix_check
  BEFORE INSERT OR UPDATE ON public.soil_sample_analyses
  FOR EACH ROW EXECUTE FUNCTION public.enforce_soil_sample_analysis_matrix();

-- La muestra no cambia de matriz si ya tiene análisis pedidos.
CREATE OR REPLACE FUNCTION public.prevent_soil_sample_matrix_change()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.matrix_id <> OLD.matrix_id
     AND EXISTS (SELECT 1 FROM public.soil_sample_analyses WHERE sample_id = NEW.id) THEN
    RAISE EXCEPTION 'No se puede cambiar la matriz de una muestra con análisis solicitados'
      USING ERRCODE = '23514';
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS soil_samples_matrix_guard ON public.soil_samples;
CREATE TRIGGER soil_samples_matrix_guard
  BEFORE UPDATE ON public.soil_samples
  FOR EACH ROW EXECUTE FUNCTION public.prevent_soil_sample_matrix_change();

-- Usuario de laboratorio de esa company, con la vertical suelo activa.
CREATE OR REPLACE FUNCTION public.can_operate_soil_company(p_company_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_company_id IS NOT NULL
    AND p_company_id = get_user_company_id()
    AND is_lab_user()
    AND user_has_active_vertical('suelo');
$$;

REVOKE ALL ON FUNCTION public.can_operate_soil_company(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.can_operate_soil_company(uuid) TO authenticated;

CREATE OR REPLACE FUNCTION public.soil_sample_company_id(p_sample_id uuid)
RETURNS uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT company_id FROM public.soil_samples WHERE id = p_sample_id;
$$;

REVOKE ALL ON FUNCTION public.soil_sample_company_id(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.soil_sample_company_id(uuid) TO authenticated;

ALTER TABLE public.soil_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_analysis_matrices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_subsamples ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_sample_analyses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_result_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.soil_results ENABLE ROW LEVEL SECURITY;

-- soil_matrices: catálogo común.
DROP POLICY IF EXISTS "Authenticated can read soil matrices" ON public.soil_matrices;
CREATE POLICY "Authenticated can read soil matrices"
  ON public.soil_matrices FOR SELECT TO authenticated USING (true);

-- soil_analyses / soil_analysis_matrices: lee el laboratorio de la company; escribe CSX.
DROP POLICY IF EXISTS "Soil lab reads company analyses" ON public.soil_analyses;
DROP POLICY IF EXISTS "CSX manages soil analyses" ON public.soil_analyses;
CREATE POLICY "Soil lab reads company analyses"
  ON public.soil_analyses FOR SELECT TO authenticated
  USING (is_csx() OR can_operate_soil_company(company_id));
CREATE POLICY "CSX manages soil analyses"
  ON public.soil_analyses FOR ALL TO authenticated
  USING (is_csx()) WITH CHECK (is_csx());

DROP POLICY IF EXISTS "Soil lab reads analysis matrices" ON public.soil_analysis_matrices;
DROP POLICY IF EXISTS "CSX manages analysis matrices" ON public.soil_analysis_matrices;
CREATE POLICY "Soil lab reads analysis matrices"
  ON public.soil_analysis_matrices FOR SELECT TO authenticated
  USING (
    is_csx()
    OR EXISTS (
      SELECT 1 FROM public.soil_analyses a
      WHERE a.id = soil_analysis_matrices.analysis_id
        AND can_operate_soil_company(a.company_id)
    )
  );
CREATE POLICY "CSX manages analysis matrices"
  ON public.soil_analysis_matrices FOR ALL TO authenticated
  USING (is_csx()) WITH CHECK (is_csx());

-- soil_samples
DROP POLICY IF EXISTS "Soil lab manages company samples" ON public.soil_samples;
DROP POLICY IF EXISTS "CSX support reads soil samples" ON public.soil_samples;
CREATE POLICY "Soil lab manages company samples"
  ON public.soil_samples FOR ALL TO authenticated
  USING (can_operate_soil_company(company_id))
  WITH CHECK (can_operate_soil_company(company_id));
CREATE POLICY "CSX support reads soil samples"
  ON public.soil_samples FOR SELECT TO authenticated
  USING (is_csx());

-- soil_subsamples / soil_sample_analyses: heredan la company de la muestra.
DROP POLICY IF EXISTS "Soil lab manages subsamples" ON public.soil_subsamples;
DROP POLICY IF EXISTS "CSX support reads subsamples" ON public.soil_subsamples;
CREATE POLICY "Soil lab manages subsamples"
  ON public.soil_subsamples FOR ALL TO authenticated
  USING (can_operate_soil_company(soil_sample_company_id(sample_id)))
  WITH CHECK (can_operate_soil_company(soil_sample_company_id(sample_id)));
CREATE POLICY "CSX support reads subsamples"
  ON public.soil_subsamples FOR SELECT TO authenticated
  USING (is_csx());

DROP POLICY IF EXISTS "Soil lab manages sample analyses" ON public.soil_sample_analyses;
DROP POLICY IF EXISTS "CSX support reads sample analyses" ON public.soil_sample_analyses;
CREATE POLICY "Soil lab manages sample analyses"
  ON public.soil_sample_analyses FOR ALL TO authenticated
  USING (can_operate_soil_company(soil_sample_company_id(sample_id)))
  WITH CHECK (can_operate_soil_company(soil_sample_company_id(sample_id)));
CREATE POLICY "CSX support reads sample analyses"
  ON public.soil_sample_analyses FOR SELECT TO authenticated
  USING (is_csx());

-- soil_result_imports
DROP POLICY IF EXISTS "Soil lab manages result imports" ON public.soil_result_imports;
DROP POLICY IF EXISTS "CSX support reads result imports" ON public.soil_result_imports;
CREATE POLICY "Soil lab manages result imports"
  ON public.soil_result_imports FOR ALL TO authenticated
  USING (can_operate_soil_company(company_id))
  WITH CHECK (can_operate_soil_company(company_id));
CREATE POLICY "CSX support reads result imports"
  ON public.soil_result_imports FOR SELECT TO authenticated
  USING (is_csx());

-- soil_results: la company sale de la submuestra.
DROP POLICY IF EXISTS "Soil lab manages results" ON public.soil_results;
DROP POLICY IF EXISTS "CSX support reads soil results" ON public.soil_results;
CREATE POLICY "Soil lab manages results"
  ON public.soil_results FOR ALL TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.soil_subsamples ss
      WHERE ss.id = soil_results.subsample_id
        AND can_operate_soil_company(soil_sample_company_id(ss.sample_id))
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.soil_subsamples ss
      WHERE ss.id = soil_results.subsample_id
        AND can_operate_soil_company(soil_sample_company_id(ss.sample_id))
    )
  );
CREATE POLICY "CSX support reads soil results"
  ON public.soil_results FOR SELECT TO authenticated
  USING (is_csx());

-- Las policies no alcanzan: sin GRANT el rol authenticated recibe "permission denied for table".
GRANT SELECT, INSERT, UPDATE, DELETE ON
  public.soil_matrices,
  public.soil_analyses,
  public.soil_analysis_matrices,
  public.soil_samples,
  public.soil_subsamples,
  public.soil_sample_analyses,
  public.soil_result_imports,
  public.soil_results
TO authenticated;

-- Archivos importados: bucket privado; la escritura queda en la service role.
INSERT INTO storage.buckets (id, name, public)
VALUES ('soil-imports', 'soil-imports', false)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;
