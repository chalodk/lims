-- 027: Catálogo de verticales y asignación company → vertical.
-- La vertical de la sesión sale de company_verticals (primaria activa). Sin fallback:
-- una company sin fila activa no opera ningún laboratorio.
-- No agrega vertical_id a samples/reports: plagas sigue en sus tablas.
-- Escritura solo CSX. Idempotente.
--
-- Probar: Nemachile ve el menú actual; una company asignada a suelo no ve Muestras/
-- Resultados/Informes de plagas; una company sin asignación ve el aviso de sin vertical.

CREATE TABLE IF NOT EXISTS public.verticals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  key text NOT NULL UNIQUE,
  name text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

INSERT INTO public.verticals (key, name) VALUES
  ('plagas_patogenos', 'Plagas y patógenos'),
  ('suelo', 'Suelo y nutrición')
ON CONFLICT (key) DO NOTHING;

CREATE TABLE IF NOT EXISTS public.company_verticals (
  company_id uuid NOT NULL REFERENCES public.companies(id) ON DELETE CASCADE,
  vertical_id uuid NOT NULL REFERENCES public.verticals(id) ON DELETE RESTRICT,
  active boolean NOT NULL DEFAULT true,
  is_primary boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (company_id, vertical_id)
);

CREATE UNIQUE INDEX IF NOT EXISTS company_verticals_one_active_primary
  ON public.company_verticals (company_id)
  WHERE is_primary AND active;

-- Companies existentes operan el laboratorio de plagas.
INSERT INTO public.company_verticals (company_id, vertical_id, active, is_primary)
SELECT c.id, v.id, true, true
FROM public.companies c
CROSS JOIN public.verticals v
WHERE v.key = 'plagas_patogenos'
  AND NOT EXISTS (
    SELECT 1 FROM public.company_verticals cv
    WHERE cv.company_id = c.id AND cv.is_primary AND cv.active
  )
ON CONFLICT (company_id, vertical_id) DO NOTHING;

-- true si la company del usuario (o la de su cliente vinculado) tiene la vertical activa.
CREATE OR REPLACE FUNCTION public.user_has_active_vertical(p_vertical_key text)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT p_vertical_key IS NOT NULL AND EXISTS (
    SELECT 1
    FROM public.company_verticals cv
    JOIN public.verticals v ON v.id = cv.vertical_id
    WHERE v.key = p_vertical_key
      AND cv.active
      AND (
        cv.company_id = get_user_company_id()
        OR cv.company_id IN (
          SELECT cl.company_id
          FROM public.user_clients uc
          JOIN public.clients cl ON cl.id = uc.client_id
          WHERE uc.user_id = auth.uid()
        )
      )
  );
$$;

REVOKE ALL ON FUNCTION public.user_has_active_vertical(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.user_has_active_vertical(text) TO authenticated;

ALTER TABLE public.verticals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.company_verticals ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated can read verticals" ON public.verticals;
DROP POLICY IF EXISTS "CSX can insert verticals" ON public.verticals;
DROP POLICY IF EXISTS "CSX can update verticals" ON public.verticals;

CREATE POLICY "Authenticated can read verticals"
  ON public.verticals FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "CSX can insert verticals"
  ON public.verticals FOR INSERT
  TO authenticated
  WITH CHECK (is_csx());

CREATE POLICY "CSX can update verticals"
  ON public.verticals FOR UPDATE
  TO authenticated
  USING (is_csx())
  WITH CHECK (is_csx());

DROP POLICY IF EXISTS "Users can read own company verticals" ON public.company_verticals;
DROP POLICY IF EXISTS "CSX can insert company verticals" ON public.company_verticals;
DROP POLICY IF EXISTS "CSX can update company verticals" ON public.company_verticals;
DROP POLICY IF EXISTS "CSX can delete company verticals" ON public.company_verticals;

CREATE POLICY "Users can read own company verticals"
  ON public.company_verticals FOR SELECT
  TO authenticated
  USING (
    is_csx()
    OR company_id = get_user_company_id()
    OR company_id IN (
      SELECT cl.company_id
      FROM public.user_clients uc
      JOIN public.clients cl ON cl.id = uc.client_id
      WHERE uc.user_id = auth.uid()
    )
  );

CREATE POLICY "CSX can insert company verticals"
  ON public.company_verticals FOR INSERT
  TO authenticated
  WITH CHECK (is_csx());

CREATE POLICY "CSX can update company verticals"
  ON public.company_verticals FOR UPDATE
  TO authenticated
  USING (is_csx())
  WITH CHECK (is_csx());

CREATE POLICY "CSX can delete company verticals"
  ON public.company_verticals FOR DELETE
  TO authenticated
  USING (is_csx());

-- Las policies no alcanzan: sin GRANT el rol authenticated recibe "permission denied for table".
GRANT SELECT, INSERT, UPDATE, DELETE ON public.verticals TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.company_verticals TO authenticated;
