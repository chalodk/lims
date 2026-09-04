-- 022: Cerrar user_clients (hoy RLS on con USING true = abierto).
-- SELECT: el propio usuario, lab de la company del cliente, admin, CSX.
-- INSERT/DELETE: lab (cliente de su company), admin, CSX. El consumidor no se auto-asigna.
--
-- Orden: 3/4. Después de 021, ANTES de 020.
-- Probar: productor sigue viendo tabs; Settings admin link/unlink; crear cliente
-- con email existente sigue vinculando; productor NO puede insertar un vínculo ajenos.

DROP POLICY IF EXISTS "Allow SELECT on user_clients" ON public.user_clients;
DROP POLICY IF EXISTS "Allow INSERT on user_clients" ON public.user_clients;
DROP POLICY IF EXISTS "Allow DELETE on user_clients" ON public.user_clients;
DROP POLICY IF EXISTS "Allow UPDATE on user_clients" ON public.user_clients;
DROP POLICY IF EXISTS "Users can view own client links" ON public.user_clients;
DROP POLICY IF EXISTS "Lab can view company client links" ON public.user_clients;
DROP POLICY IF EXISTS "Lab can insert company client links" ON public.user_clients;
DROP POLICY IF EXISTS "Lab can delete company client links" ON public.user_clients;

CREATE POLICY "Users can view own client links"
  ON public.user_clients FOR SELECT
  TO authenticated
  USING (
    user_id = auth.uid()
    OR is_admin()
    OR is_csx()
    OR EXISTS (
      SELECT 1
      FROM public.clients c
      WHERE c.id = user_clients.client_id
        AND c.company_id = get_user_company_id()
    )
  );

CREATE POLICY "Lab can insert company client links"
  ON public.user_clients FOR INSERT
  TO authenticated
  WITH CHECK (
    is_admin()
    OR is_csx()
    OR (
      is_lab_user()
      AND EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = client_id
          AND c.company_id = get_user_company_id()
      )
    )
  );

CREATE POLICY "Lab can delete company client links"
  ON public.user_clients FOR DELETE
  TO authenticated
  USING (
    is_admin()
    OR is_csx()
    OR (
      is_lab_user()
      AND EXISTS (
        SELECT 1
        FROM public.clients c
        WHERE c.id = user_clients.client_id
          AND c.company_id = get_user_company_id()
      )
    )
  );
