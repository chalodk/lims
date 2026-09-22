-- 026: Crea la tabla company_verticals para asociar empresas con verticales.
-- Permite que una empresa tenga habilitadas múltiples verticales (multi-vertical).

-- Crear tabla company_verticals
CREATE TABLE IF NOT EXISTS public.company_verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE CASCADE,
  active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.users(id),
  CONSTRAINT company_verticals_unique UNIQUE (company_id, vertical_id)
);

-- Permisos de tabla
GRANT SELECT ON public.company_verticals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_verticals TO service_role;

-- RLS
ALTER TABLE public.company_verticals ENABLE ROW LEVEL SECURITY;

-- Lectura: usuarios pueden ver las verticales de su propia empresa, csx puede ver todas
CREATE POLICY "company_verticals_select_own_company"
  ON public.company_verticals FOR SELECT
  TO authenticated
  USING (
    company_id IN (
      SELECT company_id FROM public.users WHERE id = auth.uid()
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'csx'
    )
  );

-- INSERT: solo admin de la empresa o csx
CREATE POLICY "company_verticals_insert_admin_csx"
  ON public.company_verticals FOR INSERT
  TO authenticated
  WITH CHECK (
    (
      company_id IN (
        SELECT u.company_id FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'csx'
    )
  );

-- UPDATE: solo admin de la empresa o csx
CREATE POLICY "company_verticals_update_admin_csx"
  ON public.company_verticals FOR UPDATE
  TO authenticated
  USING (
    (
      company_id IN (
        SELECT u.company_id FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid()
        AND r.name = 'admin'
      )
    )
    OR EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'csx'
    )
  );

-- DELETE: solo csx
CREATE POLICY "company_verticals_delete_csx"
  ON public.company_verticals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name = 'csx'
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_company_verticals_company ON public.company_verticals(company_id);
CREATE INDEX IF NOT EXISTS idx_company_verticals_vertical ON public.company_verticals(vertical_id);
CREATE INDEX IF NOT EXISTS idx_company_verticals_active ON public.company_verticals(active);

-- Función para asegurar que solo hay una vertical primaria por empresa
CREATE OR REPLACE FUNCTION check_single_primary_vertical()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.is_primary = true THEN
    UPDATE public.company_verticals
    SET is_primary = false
    WHERE company_id = NEW.company_id
    AND id != NEW.id
    AND is_primary = true;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER ensure_single_primary_vertical
  BEFORE INSERT OR UPDATE ON public.company_verticals
  FOR EACH ROW
  EXECUTE FUNCTION check_single_primary_vertical();
