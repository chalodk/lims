-- 019: Feature flags por company (overrides jsonb).
-- Keys y defaults viven en src/config/featureFlags.ts.
-- {} o key ausente = default del registro (producer_portal ON).
--
-- Orden: 1/4. Independiente. Idempotente.
-- Probar: CSX /admin/features carga companies; lab crea cliente con email
-- (sigue creando consumidor); productor sigue viendo Informes.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS feature_flags jsonb NOT NULL DEFAULT '{}'::jsonb;

COMMENT ON COLUMN public.companies.feature_flags IS
  'Overrides de feature flags por company. Solo se guardan diffs vs el registro en código.';
