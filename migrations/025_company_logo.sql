-- 025: Logo opcional por company para el menú lateral del host SaaS.
-- Nemachile sigue por hostname. NULL = branding genérico de LIMS.
--
-- Orden: independiente. Idempotente.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS logo_url text NULL;

COMMENT ON COLUMN public.companies.logo_url IS
  'URL pública del logo en el bucket images. NULL usa el branding del host.';
