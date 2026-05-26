-- 002: Crea la tabla analysis_types.
-- Fuente de verdad en BD para tipos de analisis, espejo del registro estatico en src/config/analysisTypes.ts.
-- La UI de customer success lee/escribe esta tabla. El codigo usa el registro estatico como fallback.

CREATE TABLE IF NOT EXISTS public.analysis_types (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  initial text NOT NULL,
  bg_color text NOT NULL DEFAULT 'bg-gray-500',
  text_color text NOT NULL DEFAULT 'text-white',
  db_areas text[] NOT NULL DEFAULT '{}',
  pdfmonkey_template_id text,
  template_env_var text,
  titulo_informe text NOT NULL DEFAULT '',
  tipo_analisis_descripcion text NOT NULL DEFAULT '',
  metodologia_descripcion text NOT NULL DEFAULT '',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permisos de tabla (necesario porque GRANT ALL ON ALL TABLES no cubre tablas creadas despues)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.analysis_types TO authenticated;

-- RLS: el codigo (withAuth + role check) es la verdadera capa de autorizacion.
-- Las politicas de RLS son un safety net adicional.
ALTER TABLE public.analysis_types ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado puede leer (el codigo filtra por admin donde necesario)
CREATE POLICY "Enable read for authenticated users"
  ON public.analysis_types FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo admin (verificado via subquery a users + roles)
CREATE POLICY "Enable insert for admin users"
  ON public.analysis_types FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );

CREATE POLICY "Enable update for admin users"
  ON public.analysis_types FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );

CREATE POLICY "Enable delete for admin users"
  ON public.analysis_types FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users
      WHERE users.id = auth.uid()
      AND users.role_id IN (SELECT id FROM public.roles WHERE name = 'admin')
    )
  );
