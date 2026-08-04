-- 016: Catálogo de plaguicidas autorizados SAG (products_sag).
-- Columnas alineadas al resumen oficial "Plaguicidas Autorizados".
-- numero_sag es text porque existen códigos con sufijo (ej. 1640-O).

CREATE TABLE IF NOT EXISTS public.products_sag (
  numero_sag text PRIMARY KEY,
  nombre_comercial text NOT NULL,
  aptitud text NOT NULL,
  sustancias_activas text NOT NULL,
  concentracion text NOT NULL,
  formulacion text NOT NULL,
  titular_autorizacion text NOT NULL,
  primera_autorizacion date NOT NULL,
  vencimiento_autorizacion date NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_products_sag_aptitud
  ON public.products_sag (aptitud);

CREATE INDEX IF NOT EXISTS idx_products_sag_nombre_comercial
  ON public.products_sag (nombre_comercial);

COMMENT ON TABLE public.products_sag IS 'Catálogo de plaguicidas autorizados SAG; fuente para prescripción fitosanitaria';
COMMENT ON COLUMN public.products_sag.numero_sag IS 'Nº SAG (puede incluir sufijo, ej. 1640-O)';
COMMENT ON COLUMN public.products_sag.nombre_comercial IS 'Nombre comercial del producto';
COMMENT ON COLUMN public.products_sag.aptitud IS 'Aptitud registrada (Nematicida, Fungicida, etc.)';
COMMENT ON COLUMN public.products_sag.sustancias_activas IS 'Sustancia(s) activa(s)';
COMMENT ON COLUMN public.products_sag.concentracion IS 'Concentración declarada';
COMMENT ON COLUMN public.products_sag.formulacion IS 'Formulación (código)';
COMMENT ON COLUMN public.products_sag.titular_autorizacion IS 'Titular de la autorización';
COMMENT ON COLUMN public.products_sag.primera_autorizacion IS 'Fecha de primera autorización';
COMMENT ON COLUMN public.products_sag.vencimiento_autorizacion IS 'Fecha de vencimiento de la autorización';

GRANT SELECT, INSERT, UPDATE, DELETE ON public.products_sag TO authenticated;

ALTER TABLE public.products_sag ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.products_sag;
CREATE POLICY "Enable read for authenticated users"
  ON public.products_sag FOR SELECT
  TO authenticated
  USING (true);

DROP POLICY IF EXISTS "Enable insert for csx" ON public.products_sag;
CREATE POLICY "Enable insert for csx"
  ON public.products_sag FOR INSERT
  TO authenticated
  WITH CHECK (is_csx());

DROP POLICY IF EXISTS "Enable update for csx" ON public.products_sag;
CREATE POLICY "Enable update for csx"
  ON public.products_sag FOR UPDATE
  TO authenticated
  USING (is_csx());

DROP POLICY IF EXISTS "Enable delete for csx" ON public.products_sag;
CREATE POLICY "Enable delete for csx"
  ON public.products_sag FOR DELETE
  TO authenticated
  USING (is_csx());
