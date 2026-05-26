-- 011: Tabla de opciones de metodologia y tecnicas de identificacion.
-- Catalogo global gestionado por csx. Reemplaza los arrays hardcodeados en AddResultModal.

CREATE TABLE IF NOT EXISTS public.methodology_options (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text NOT NULL CHECK (category IN ('methodology', 'technique')),
  active boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Permisos de tabla
GRANT SELECT, INSERT, UPDATE, DELETE ON public.methodology_options TO authenticated;

-- RLS
ALTER TABLE public.methodology_options ENABLE ROW LEVEL SECURITY;

-- Lectura: cualquier usuario autenticado
CREATE POLICY "Enable read for authenticated users"
  ON public.methodology_options FOR SELECT
  TO authenticated
  USING (true);

-- Escritura: solo csx
CREATE POLICY "Enable write for csx"
  ON public.methodology_options FOR INSERT
  TO authenticated
  WITH CHECK (is_csx());

CREATE POLICY "Enable update for csx"
  ON public.methodology_options FOR UPDATE
  TO authenticated
  USING (is_csx());

CREATE POLICY "Enable delete for csx"
  ON public.methodology_options FOR DELETE
  TO authenticated
  USING (is_csx());

-- Seed: valores actuales hardcodeados en AddResultModal.tsx
INSERT INTO public.methodology_options (name, category) VALUES
  ('Tamizado de Cobb y Embudo de Baermann', 'methodology'),
  ('Metodo de Fenwick', 'methodology'),
  ('Centrifuga', 'methodology'),
  ('Incubacion y Tamizado de Cobb', 'methodology'),
  ('Placa petri', 'methodology'),
  ('Incubacion', 'methodology'),
  ('Camara humeda', 'methodology'),
  ('Recuento de colonias', 'methodology'),
  ('Taxonomia tradicional', 'technique'),
  ('RT-PCR', 'technique'),
  ('PCR', 'technique'),
  ('ELISA', 'technique')
ON CONFLICT DO NOTHING;
