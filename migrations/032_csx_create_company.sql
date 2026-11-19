-- 032: Alta de companies solo por CSX.
-- No hay policy de INSERT: un JWT (incluido el de un admin de laboratorio)
-- no puede escribir en public.companies. El alta pasa por create_company(),
-- que fija plan, trial, flags y el actor. No crea usuarios ni verticales.
-- Idempotente. is_csx() ya existe (009).
--
-- El tope de 120 caracteres debe coincidir con COMPANY_NAME_MAX_LENGTH
-- en src/lib/companies/createCompany.ts.

ALTER TABLE public.companies
  ADD COLUMN IF NOT EXISTS created_by uuid NULL REFERENCES public.users(id) ON DELETE SET NULL;

COMMENT ON COLUMN public.companies.created_by IS 'Usuario CSX que creó la company';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM public.companies
    GROUP BY lower(btrim(name))
    HAVING count(*) > 1
  ) THEN
    RAISE EXCEPTION 'hay companies con el mismo nombre; resolver antes de companies_name_lower_unique';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS companies_name_lower_unique
  ON public.companies (lower(btrim(name)));

REVOKE INSERT ON TABLE public.companies FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.create_company(p_name text)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text;
  opened_at timestamptz;
  created_id uuid;
  created_name text;
  created_plan text;
  created_trial_ends_at timestamptz;
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  normalized_name := btrim(p_name);
  IF normalized_name IS NULL
    OR normalized_name = ''
    OR char_length(normalized_name) > 120
    OR normalized_name ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'nombre inválido'
      USING ERRCODE = '22023';
  END IF;

  opened_at := now();

  INSERT INTO public.companies (
    name,
    plan_tier,
    feature_flags,
    trial_started_at,
    trial_ends_at,
    plan_updated_at,
    plan_updated_by,
    created_by
  ) VALUES (
    normalized_name,
    'growth',
    '{}'::jsonb,
    opened_at,
    opened_at + interval '14 days',
    opened_at,
    auth.uid(),
    auth.uid()
  )
  RETURNING id, name, plan_tier, trial_ends_at
  INTO created_id, created_name, created_plan, created_trial_ends_at;

  RETURN jsonb_build_object(
    'id', created_id,
    'name', created_name,
    'plan_tier', created_plan,
    'trial_ends_at', created_trial_ends_at
  );
EXCEPTION
  WHEN unique_violation THEN
    RAISE EXCEPTION 'company name already exists'
      USING ERRCODE = '23505';
END;
$$;

REVOKE ALL ON FUNCTION public.create_company(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company(text) TO authenticated;
