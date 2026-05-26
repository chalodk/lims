-- 010: Corrige RLS de company_analysis_type_templates para csx cross-company.
-- La politica original exigia u.company_id = template.company_id, lo cual falla
-- para csx (que no tiene una company fija o gestiona multiples companies).

-- Recrear politica de escritura: csx puede escribir en cualquier company, admin solo en la suya
DROP POLICY IF EXISTS "Enable write for company admins and csx" ON public.company_analysis_type_templates;

-- csx: acceso total de escritura a cualquier company
CREATE POLICY "Enable write for csx"
  ON public.company_analysis_type_templates FOR ALL
  TO authenticated
  USING (is_csx())
  WITH CHECK (is_csx());

-- admin: solo en su propia company
CREATE POLICY "Enable write for company admins"
  ON public.company_analysis_type_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.company_id = company_analysis_type_templates.company_id
      AND r.name = 'admin'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.company_id = company_analysis_type_templates.company_id
      AND r.name = 'admin'
    )
  );
