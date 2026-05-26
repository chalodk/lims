-- 009: Permite al rol csx ver todas las companies.
-- La politica original solo permite ver la propia company o ser admin.
-- csx necesita ver todas para gestionar templates cross-company.

-- Funcion helper para verificar rol csx (similar a is_admin())
CREATE OR REPLACE FUNCTION is_csx()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users
    WHERE users.id = auth.uid()
    AND users.role_id = (SELECT id FROM public.roles WHERE name = 'csx')
  );
$$;

-- Actualizar politica SELECT de companies para incluir csx
DROP POLICY IF EXISTS "Users can view their own company" ON public.companies;
CREATE POLICY "Users can view their own company"
  ON public.companies FOR SELECT
  TO authenticated
  USING (
    id = get_user_company_id() OR is_admin() OR is_csx()
  );
