-- 036: Toma de muestra y quién la muestreó, en muestras de suelo.
-- sampled_at es la fecha de toma, distinta de received_at (recepción).
-- sampled_by: client = cliente, lab = laboratorio.
-- Las muestras ya cargadas quedan con la fecha de recepción y muestreo del cliente.

ALTER TABLE public.soil_samples
  ADD COLUMN IF NOT EXISTS sampled_at date,
  ADD COLUMN IF NOT EXISTS sampled_by text;

UPDATE public.soil_samples
SET sampled_at = received_at
WHERE sampled_at IS NULL;

UPDATE public.soil_samples
SET sampled_by = 'client'
WHERE sampled_by IS NULL;

ALTER TABLE public.soil_samples
  ALTER COLUMN sampled_at SET NOT NULL,
  ALTER COLUMN sampled_by SET NOT NULL;

ALTER TABLE public.soil_samples
  DROP CONSTRAINT IF EXISTS soil_samples_sampled_by_check;

ALTER TABLE public.soil_samples
  ADD CONSTRAINT soil_samples_sampled_by_check
  CHECK (sampled_by IN ('client', 'lab'));

COMMENT ON COLUMN public.soil_samples.sampled_at IS
  'Fecha en que se tomó la muestra. Distinta de received_at, que es la recepción en el laboratorio.';

COMMENT ON COLUMN public.soil_samples.sampled_by IS
  'Quién tomó la muestra: client (cliente) o lab (laboratorio).';
