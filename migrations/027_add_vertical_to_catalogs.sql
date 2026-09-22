-- 027: Agrega vertical_id a las tablas de catálogo para soportar catálogos independientes por vertical.
-- Tablas afectadas: analysis_types, analytes, test_catalog, methods, interpretation_rules, sla_policies

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Agregar columna vertical_id a analysis_types
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.analysis_types 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_analysis_types_vertical 
ON public.analysis_types(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Agregar columna vertical_id a analytes
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.analytes 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_analytes_vertical 
ON public.analytes(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Agregar columna vertical_id a test_catalog
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.test_catalog 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_test_catalog_vertical 
ON public.test_catalog(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Agregar columna vertical_id a methods
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.methods 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_methods_vertical 
ON public.methods(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Agregar columna vertical_id a interpretation_rules
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.interpretation_rules 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_interpretation_rules_vertical 
ON public.interpretation_rules(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Agregar columna vertical_id a sla_policies
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.sla_policies 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_sla_policies_vertical 
ON public.sla_policies(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Agregar vertical_id a samples para tracking de qué vertical pertenece cada muestra
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.samples 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_samples_vertical 
ON public.samples(vertical_id);

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Agregar vertical_id a reports
-- ══════════════════════════════════════════════════════════════════════════════
ALTER TABLE public.reports 
ADD COLUMN IF NOT EXISTS vertical_id uuid REFERENCES public.verticals(id);

CREATE INDEX IF NOT EXISTS idx_reports_vertical 
ON public.reports(vertical_id);
