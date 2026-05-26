-- 008: Actualiza politicas RLS de analysis_types para incluir rol csx.
-- Las politicas originales solo permitian admin, pero el codigo ahora usa csx para escritura.
-- GET permite admin + csx; POST/PATCH/DELETE solo csx.

-- Recrear politica INSERT para aceptar admin y csx
DROP POLICY IF EXISTS "Enable insert for admin users" ON public.analysis_types;
CREATE POLICY "Enable insert for admin and csx users"
  ON public.analysis_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name IN ('admin', 'csx'))
    )
  );

-- Recrear politica UPDATE para aceptar admin y csx
DROP POLICY IF EXISTS "Enable update for admin users" ON public.analysis_types;
CREATE POLICY "Enable update for admin and csx users"
  ON public.analysis_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name IN ('admin', 'csx'))
    )
  );

-- Recrear politica DELETE para aceptar admin y csx
DROP POLICY IF EXISTS "Enable delete for admin users" ON public.analysis_types;
CREATE POLICY "Enable delete for admin and csx users"
  ON public.analysis_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name IN ('admin', 'csx'))
    )
  );
