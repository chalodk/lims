-- La matriz deja de pedirse al crear la muestra y pasa a cada resultado.
-- received_at sigue siendo la fecha de recepción, distinta de created_at.

ALTER TABLE public.soil_samples
  ALTER COLUMN matrix_id DROP NOT NULL;

ALTER TABLE public.soil_results
  ADD COLUMN IF NOT EXISTS matrix_id uuid REFERENCES public.soil_matrices(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS soil_results_matrix_idx
  ON public.soil_results (matrix_id);

COMMENT ON COLUMN public.soil_samples.received_at IS
  'Fecha de recepción informada por el laboratorio. Distinta de created_at, que pone la base al insertar.';

COMMENT ON COLUMN public.soil_results.matrix_id IS
  'Matriz de este resultado. La muestra puede tener resultados de más de una matriz.';

-- En CaCO3 Eq la columna B es gramos de CO2, no el número de submuestra.
UPDATE public.soil_analyses
SET excel_subsample_column = NULL
WHERE analysis_key = 'caco3_equivalente_suelo';

-- En huevos de helmintos la columna B es el tipo de muestra y la C es la submuestra.
UPDATE public.soil_analyses
SET excel_subsample_column = 'C'
WHERE analysis_key = 'huevos_de_helminto_huevos_2_g_compost_digestato';

-- Las policies no alcanzan: sin GRANT el rol authenticated recibe "permission denied for table".
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verticals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_verticals TO authenticated;
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
