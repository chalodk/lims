-- 006: Tabla para sobreescritura de templates PDFMonkey por company.
-- Permite que cada company configure su propio template ID por tipo de analisis
-- (logos, colores, etc. personalizados).
-- La cadena de resolucion es: company -> global DB -> env var -> fallback.

CREATE TABLE IF NOT EXISTS public.company_analysis_type_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  analysis_type_key text NOT NULL,
  pdfmonkey_template_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (company_id, analysis_type_key)
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_analysis_type_templates TO authenticated;

ALTER TABLE public.company_analysis_type_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read for authenticated users"
  ON public.company_analysis_type_templates FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable write for company admins and csx"
  ON public.company_analysis_type_templates FOR ALL
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND u.company_id = company_analysis_type_templates.company_id
      AND r.name IN ('admin', 'csx')
    )
  );
