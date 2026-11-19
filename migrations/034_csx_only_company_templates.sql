-- 034: La escritura de templates PDFMonkey queda solo en CSX.
-- El laboratorio ya no edita company_analysis_type_templates desde Configuración.
-- La lectura sigue abierta: el informe de plagas resuelve el template con la sesión del lab.
-- Idempotente. is_csx() ya existe (009). La policy de CSX ya existe (010).

DROP POLICY IF EXISTS "Enable write for company admins" ON public.company_analysis_type_templates;
