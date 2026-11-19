-- 033: Primer admin de una company, solo CSX.
-- La sesión de CSX no puede insertar en public.users (la policy exige is_admin()).
-- create_company_first_admin traba la company e inserta el perfil con rol admin.
-- El correo de confirmación lo manda Auth (inviteUserByEmail), no esta función.
-- Idempotente. is_csx() ya existe (009).
--
-- El tope de 120 caracteres del nombre debe coincidir con ADMIN_NAME_MAX_LENGTH
-- en src/lib/companies/inviteCompanyAdmin.ts.

CREATE OR REPLACE FUNCTION public.csx_email_is_registered(p_email text)
RETURNS boolean
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_email text;
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  normalized_email := lower(btrim(p_email));
  IF normalized_email IS NULL OR normalized_email = '' THEN
    RETURN false;
  END IF;

  RETURN EXISTS (
    SELECT 1
    FROM auth.users
    WHERE lower(email) = normalized_email
  ) OR EXISTS (
    SELECT 1
    FROM public.users
    WHERE lower(email) = normalized_email
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.csx_company_first_admins()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  RETURN COALESCE((
    SELECT jsonb_agg(jsonb_build_object(
      'company_id', first_user.company_id,
      'email', first_user.email
    ))
    FROM (
      SELECT DISTINCT ON (company_id) company_id, email
      FROM public.users
      WHERE company_id IS NOT NULL
      ORDER BY company_id, created_at ASC NULLS LAST, id
    ) first_user
  ), '[]'::jsonb);
END;
$$;

CREATE OR REPLACE FUNCTION public.create_company_first_admin(
  p_user_id uuid,
  p_company_id uuid,
  p_name text,
  p_email text
)
RETURNS jsonb
LANGUAGE plpgsql
VOLATILE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  normalized_name text;
  normalized_email text;
  company_row_id uuid;
  admin_role_id integer;
BEGIN
  IF NOT is_csx() THEN
    RAISE EXCEPTION 'not authorized'
      USING ERRCODE = '42501';
  END IF;

  normalized_name := btrim(p_name);
  normalized_email := lower(btrim(p_email));

  IF normalized_name IS NULL
    OR normalized_name = ''
    OR char_length(normalized_name) > 120
    OR normalized_name ~ '[[:cntrl:]]'
  THEN
    RAISE EXCEPTION 'nombre inválido'
      USING ERRCODE = '22023';
  END IF;

  IF normalized_email IS NULL
    OR normalized_email = ''
    OR position('@' IN normalized_email) = 0
  THEN
    RAISE EXCEPTION 'email inválido'
      USING ERRCODE = '22023';
  END IF;

  SELECT id INTO company_row_id
  FROM public.companies
  WHERE id = p_company_id
  FOR UPDATE;

  IF company_row_id IS NULL THEN
    RAISE EXCEPTION 'Compañía no encontrada'
      USING ERRCODE = 'P0002';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users WHERE company_id = p_company_id
  ) THEN
    RAISE EXCEPTION 'company already has a user'
      USING ERRCODE = '23505';
  END IF;

  IF EXISTS (
    SELECT 1 FROM public.users WHERE lower(email) = normalized_email
  ) THEN
    RAISE EXCEPTION 'email already registered'
      USING ERRCODE = '23505';
  END IF;

  SELECT id INTO admin_role_id
  FROM public.roles
  WHERE name = 'admin';

  IF admin_role_id IS NULL THEN
    RAISE EXCEPTION 'rol admin no encontrado'
      USING ERRCODE = 'P0001';
  END IF;

  INSERT INTO public.users (id, name, email, role_id, company_id)
  VALUES (p_user_id, normalized_name, normalized_email, admin_role_id, p_company_id);

  RETURN jsonb_build_object(
    'id', p_user_id,
    'name', normalized_name,
    'email', normalized_email
  );
END;
$$;

REVOKE ALL ON FUNCTION public.csx_email_is_registered(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.csx_email_is_registered(text) TO authenticated;

REVOKE ALL ON FUNCTION public.csx_company_first_admins() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.csx_company_first_admins() TO authenticated;

REVOKE ALL ON FUNCTION public.create_company_first_admin(uuid, uuid, text, text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.create_company_first_admin(uuid, uuid, text, text) TO authenticated;
