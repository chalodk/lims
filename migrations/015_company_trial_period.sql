-- 015: Prueba gratuita 14 días + plan por defecto growth

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS trial_started_at timestamptz NULL,
  ADD COLUMN IF NOT EXISTS trial_ends_at timestamptz NULL;

COMMENT ON COLUMN public.companies.trial_started_at IS 'Inicio de la prueba gratuita';
COMMENT ON COLUMN public.companies.trial_ends_at IS 'Fin de la prueba gratuita; si now() < trial_ends_at la company está en trial';

-- Default comercial post-prueba / onboarding: growth
ALTER TABLE public.companies
  ALTER COLUMN plan_tier SET DEFAULT 'growth';

-- Companies existentes sin plan explícito reciente quedan en growth si aún están en starter por default previo
-- (no forzamos UPDATE masivo; CSX asigna. Solo default para inserts nuevos.)
