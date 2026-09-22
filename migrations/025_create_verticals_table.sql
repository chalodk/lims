-- 025: Crea la tabla verticals para soportar múltiples verticales de análisis.
-- Esta tabla define las verticales disponibles en la plataforma (plagas_patogenos, suelo, tejidos, etc.)
-- Permite escalar horizontalmente el producto hacia nuevos mercados de laboratorio.

-- Crear tabla verticals
CREATE TABLE IF NOT EXISTS public.verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  label text NOT NULL,
  description text,
  icon text,
  default_config jsonb DEFAULT '{}',
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Permisos de tabla
GRANT SELECT ON public.verticals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verticals TO service_role;

-- RLS: lectura pública para usuarios autenticados, escritura solo para admin/csx
ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado puede ver las verticales
CREATE POLICY "verticals_select_authenticated"
  ON public.verticals FOR SELECT
  TO authenticated
  USING (true);

-- Escritura (INSERT/UPDATE/DELETE): solo admin o csx
CREATE POLICY "verticals_insert_admin_csx"
  ON public.verticals FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'csx')
    )
  );

CREATE POLICY "verticals_update_admin_csx"
  ON public.verticals FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'csx')
    )
  );

CREATE POLICY "verticals_delete_admin_csx"
  ON public.verticals FOR DELETE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.users u
      JOIN public.roles r ON u.role_id = r.id
      WHERE u.id = auth.uid()
      AND r.name IN ('admin', 'csx')
    )
  );

-- Índices
CREATE INDEX IF NOT EXISTS idx_verticals_key ON public.verticals(key);
CREATE INDEX IF NOT EXISTS idx_verticals_active ON public.verticals(active);

-- Seed inicial de verticales
INSERT INTO public.verticals (key, label, description, icon, default_config)
VALUES
(
  'plagas_patogenos',
  'Plagas y Patógenos',
  'Análisis de plagas y patógenos vegetales: nematología, fitopatología, virología, bacteriología y detección precoz.',
  'bug',
  '{
    "areas": ["nematologia", "fitopatologia", "virologia", "bacteriologia", "deteccion_precoz"],
    "sample_fields": ["species", "variety", "rootstock", "planting_year", "previous_crop", "next_crop"],
    "analyte_types": ["virus", "hongo", "nematodo", "bacteria", "abiotico"]
  }'::jsonb
),
(
  'suelo',
  'Análisis de Suelo',
  'Análisis físico-químico y biológico de suelos agrícolas.',
  'mountain',
  '{
    "areas": ["fertilidad", "fisica", "quimica", "microbiologia"],
    "sample_fields": ["depth", "texture", "irrigation_type"],
    "analyte_types": ["nutriente", "mineral", "parametro_fisico"]
  }'::jsonb
),
(
  'tejidos',
  'Análisis de Tejidos',
  'Análisis foliar y de tejidos vegetales para diagnóstico nutricional.',
  'leaf',
  '{
    "areas": ["foliar", "peciolo", "fruto"],
    "sample_fields": ["tissue_type", "growth_stage", "sampling_position"],
    "analyte_types": ["macronutriente", "micronutriente"]
  }'::jsonb
)
ON CONFLICT (key) DO NOTHING;
