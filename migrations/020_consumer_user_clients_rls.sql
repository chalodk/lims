-- 020: Policies consumidor leen user_clients (además de users.client_id).
-- El productor NO ve el directorio de clientes del lab. Sí lee SU fila en
-- public.clients (nombre en tabs) y sus samples/reports/findings.
--
-- NO reescribe get_user_client_id() (evitar LIMIT 1 en policies viejas).
-- NO cierra el leak de compañía (is_lab_user). NO urgente: el portal ya
-- lista informes por la policy de company.
--
-- Orden: 4/4. Aplicar DESPUÉS de 022. Idempotente.

CREATE OR REPLACE FUNCTION public.get_user_client_ids()
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT u.client_id
  FROM public.users u
  WHERE u.id = auth.uid()
    AND u.client_id IS NOT NULL
  UNION
  SELECT uc.client_id
  FROM public.user_clients uc
  WHERE uc.user_id = auth.uid();
$$;

GRANT EXECUTE ON FUNCTION public.get_user_client_ids() TO authenticated;

-- clients
DROP POLICY IF EXISTS "Consumers can view their own client" ON public.clients;
CREATE POLICY "Consumers can view their own client"
  ON public.clients FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND id IN (SELECT public.get_user_client_ids())
  );

-- samples
DROP POLICY IF EXISTS "Consumers can view their client samples" ON public.samples;
DROP POLICY IF EXISTS "Consumers can view their own samples" ON public.samples;
CREATE POLICY "Consumers can view their client samples"
  ON public.samples FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND client_id IN (SELECT public.get_user_client_ids())
  );

-- results
DROP POLICY IF EXISTS "Consumers can view results for their client samples" ON public.results;
CREATE POLICY "Consumers can view results for their client samples"
  ON public.results FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- reports
DROP POLICY IF EXISTS "Consumers can view their client reports" ON public.reports;
CREATE POLICY "Consumers can view their client reports"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND client_id IN (SELECT public.get_user_client_ids())
  );

-- sample_tests
DROP POLICY IF EXISTS "Consumers can view sample_tests for their client samples" ON public.sample_tests;
CREATE POLICY "Consumers can view sample_tests for their client samples"
  ON public.sample_tests FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- sample_units
DROP POLICY IF EXISTS "Consumers can view sample_units for their client samples" ON public.sample_units;
CREATE POLICY "Consumers can view sample_units for their client samples"
  ON public.sample_units FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- unit_results
DROP POLICY IF EXISTS "Consumers can view unit_results for their client samples" ON public.unit_results;
CREATE POLICY "Consumers can view unit_results for their client samples"
  ON public.unit_results FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_unit_id IN (
      SELECT su.id
      FROM public.sample_units su
      JOIN public.samples s ON s.id = su.sample_id
      WHERE s.client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- sample_files
DROP POLICY IF EXISTS "Consumers can view sample_files for their client samples" ON public.sample_files;
CREATE POLICY "Consumers can view sample_files for their client samples"
  ON public.sample_files FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- applied_interpretations
DROP POLICY IF EXISTS "Consumers can view applied_interpretations for their client samples" ON public.applied_interpretations;
CREATE POLICY "Consumers can view applied_interpretations for their client samples"
  ON public.applied_interpretations FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- report_assets
DROP POLICY IF EXISTS "Consumers can view report_assets for their client reports" ON public.report_assets;
CREATE POLICY "Consumers can view report_assets for their client reports"
  ON public.report_assets FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND report_id IN (
      SELECT id FROM public.reports
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );

-- findings_normalized
DROP POLICY IF EXISTS "Consumers can view findings_normalized for their client samples" ON public.findings_normalized;
CREATE POLICY "Consumers can view findings_normalized for their client samples"
  ON public.findings_normalized FOR SELECT
  TO authenticated
  USING (
    get_user_role() = 'consumidor'
    AND sample_id IN (
      SELECT id FROM public.samples
      WHERE client_id IN (SELECT public.get_user_client_ids())
    )
  );
