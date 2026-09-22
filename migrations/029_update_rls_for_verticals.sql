-- 029: Actualiza políticas RLS para incluir filtrado por vertical.
-- Las políticas existentes se mantienen, se agregan políticas adicionales para filtrado por vertical.

-- ══════════════════════════════════════════════════════════════════════════════
-- 1. Función helper para verificar acceso a vertical
-- ══════════════════════════════════════════════════════════════════════════════
CREATE OR REPLACE FUNCTION user_has_vertical_access(p_vertical_id uuid)
RETURNS boolean AS $$
DECLARE
  user_company_id uuid;
  is_csx boolean;
BEGIN
  -- Obtener company_id y verificar si es CSX
  SELECT u.company_id, (r.name = 'csx')
  INTO user_company_id, is_csx
  FROM public.users u
  LEFT JOIN public.roles r ON u.role_id = r.id
  WHERE u.id = auth.uid();

  -- CSX tiene acceso a todas las verticales
  IF is_csx THEN
    RETURN true;
  END IF;

  -- Si no tiene company_id, no tiene acceso
  IF user_company_id IS NULL THEN
    RETURN false;
  END IF;

  -- Si vertical_id es NULL, permitir acceso (compatibilidad backward)
  IF p_vertical_id IS NULL THEN
    RETURN true;
  END IF;

  -- Verificar si la empresa tiene acceso a esta vertical
  RETURN EXISTS (
    SELECT 1 FROM public.company_verticals cv
    WHERE cv.company_id = user_company_id
    AND cv.vertical_id = p_vertical_id
    AND cv.active = true
  );
END;
$$ LANGUAGE plpgsql STABLE SECURITY DEFINER;

-- ══════════════════════════════════════════════════════════════════════════════
-- 2. Políticas RLS para analysis_types con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
-- Nota: Las políticas existentes permiten lectura a todos los usuarios autenticados.
-- Agregamos una política más restrictiva que verifica acceso a la vertical.

-- Eliminar política de lectura existente si existe
DROP POLICY IF EXISTS "Enable read for authenticated users" ON public.analysis_types;
DROP POLICY IF EXISTS "analysis_types_select_with_vertical" ON public.analysis_types;

-- Nueva política de lectura con verificación de vertical
CREATE POLICY "analysis_types_select_with_vertical"
  ON public.analysis_types FOR SELECT
  TO authenticated
  USING (
    -- Acceso si: vertical_id es NULL (legacy) O usuario tiene acceso a la vertical
    vertical_id IS NULL 
    OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 3. Políticas RLS para samples con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
-- Las samples ya tienen RLS basado en company_id. Agregamos verificación de vertical.

DROP POLICY IF EXISTS "samples_select_with_vertical" ON public.samples;

-- Nota: Esta política es adicional a las existentes, no reemplaza
-- Si la tabla no tiene políticas existentes, esta será la única
CREATE POLICY "samples_select_with_vertical"
  ON public.samples FOR SELECT
  TO authenticated
  USING (
    -- Permitir si:
    -- 1. vertical_id es NULL (legacy)
    -- 2. Usuario tiene acceso a la vertical
    -- 3. La muestra pertenece a la empresa del usuario
    (vertical_id IS NULL OR user_has_vertical_access(vertical_id))
    AND (
      company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'csx'
      )
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 4. Políticas RLS para reports con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "reports_select_with_vertical" ON public.reports;

CREATE POLICY "reports_select_with_vertical"
  ON public.reports FOR SELECT
  TO authenticated
  USING (
    (vertical_id IS NULL OR user_has_vertical_access(vertical_id))
    AND (
      company_id IN (SELECT company_id FROM public.users WHERE id = auth.uid())
      OR EXISTS (
        SELECT 1 FROM public.users u
        JOIN public.roles r ON u.role_id = r.id
        WHERE u.id = auth.uid() AND r.name = 'csx'
      )
    )
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 5. Políticas RLS para test_catalog con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "test_catalog_select_with_vertical" ON public.test_catalog;

CREATE POLICY "test_catalog_select_with_vertical"
  ON public.test_catalog FOR SELECT
  TO authenticated
  USING (
    vertical_id IS NULL OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 6. Políticas RLS para methods con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "methods_select_with_vertical" ON public.methods;

CREATE POLICY "methods_select_with_vertical"
  ON public.methods FOR SELECT
  TO authenticated
  USING (
    vertical_id IS NULL OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 7. Políticas RLS para analytes con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "analytes_select_with_vertical" ON public.analytes;

CREATE POLICY "analytes_select_with_vertical"
  ON public.analytes FOR SELECT
  TO authenticated
  USING (
    vertical_id IS NULL OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 8. Políticas RLS para interpretation_rules con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "interpretation_rules_select_with_vertical" ON public.interpretation_rules;

CREATE POLICY "interpretation_rules_select_with_vertical"
  ON public.interpretation_rules FOR SELECT
  TO authenticated
  USING (
    vertical_id IS NULL OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 9. Políticas RLS para sla_policies con filtrado por vertical
-- ══════════════════════════════════════════════════════════════════════════════
DROP POLICY IF EXISTS "sla_policies_select_with_vertical" ON public.sla_policies;

CREATE POLICY "sla_policies_select_with_vertical"
  ON public.sla_policies FOR SELECT
  TO authenticated
  USING (
    vertical_id IS NULL OR user_has_vertical_access(vertical_id)
  );

-- ══════════════════════════════════════════════════════════════════════════════
-- 10. Comentarios de documentación
-- ══════════════════════════════════════════════════════════════════════════════
COMMENT ON FUNCTION user_has_vertical_access IS 
'Verifica si el usuario autenticado tiene acceso a una vertical específica.
CSX tiene acceso a todas las verticales.
Para otros usuarios, verifica la tabla company_verticals.
Retorna true si vertical_id es NULL (compatibilidad backward).';

COMMENT ON POLICY "analysis_types_select_with_vertical" ON public.analysis_types IS
'Permite lectura de analysis_types solo si el usuario tiene acceso a la vertical correspondiente.';

COMMENT ON POLICY "samples_select_with_vertical" ON public.samples IS
'Permite lectura de samples solo si: pertenece a la empresa del usuario Y tiene acceso a la vertical.';

COMMENT ON POLICY "reports_select_with_vertical" ON public.reports IS
'Permite lectura de reports solo si: pertenece a la empresa del usuario Y tiene acceso a la vertical.';
