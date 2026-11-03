-- 026: Bucket público para las imágenes adjuntas de un informe.
-- El prefijo del objeto es el report_id. La escritura queda en la service role.
--
-- Orden: independiente. Idempotente.

INSERT INTO storage.buckets (id, name, public)
VALUES ('reports', 'reports', true)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public;

DROP POLICY IF EXISTS "Public read report images" ON storage.objects;

CREATE POLICY "Public read report images"
ON storage.objects
FOR SELECT
TO public
USING (bucket_id = 'reports');
