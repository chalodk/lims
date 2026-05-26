-- 012: RLS policies para tabla analytes. Permite escritura al rol csx.

-- Permisos de tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analytes TO authenticated;

-- RLS
ALTER TABLE public.analytes ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.analytes;
CREATE POLICY "Enable read for authenticated users"
  ON public.analytes FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo csx
DROP POLICY IF EXISTS "Enable insert for csx" ON public.analytes;
CREATE POLICY "Enable insert for csx"
  ON public.analytes FOR INSERT
  TO authenticated
  WITH CHECK (is_csx());

DROP POLICY IF EXISTS "Enable update for csx" ON public.analytes;
CREATE POLICY "Enable update for csx"
  ON public.analytes FOR UPDATE
  TO authenticated
  USING (is_csx());

DROP POLICY IF EXISTS "Enable delete for csx" ON public.analytes;
CREATE POLICY "Enable delete for csx"
  ON public.analytes FOR DELETE
  TO authenticated
  USING (is_csx());
