-- 004: Corrige permisos de analysis_types.
-- El GRANT ALL ON ALL TABLES del script de RLS solo aplica a tablas existentes
-- al momento de ejecutarlo. Esta tabla se creo despues y necesita permisos explicitos.

-- Otorgar permisos de tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_types TO authenticated;

-- Simplificar politica SELECT (el codigo ya hace role check admin)
DROP POLICY IF EXISTS "Authenticated users can read active analysis types" ON public.analysis_types;

CREATE POLICY "Enable read for authenticated users"
  ON public.analysis_types FOR SELECT
  TO authenticated
  USING (true);

-- Las politicas de escritura se mantienen con subquery de admin
-- Si fallan, se pueden dropear y confiar solo en el check de codigo
