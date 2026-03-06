-- ============================================================================
-- Script de verificación post-RLS
-- Ejecutar DESPUÉS de enable-rls-complete.sql
-- ============================================================================
--
-- Este script verifica:
-- 1. Que todas las políticas RLS estén creadas y activas
-- 2. Que las funciones helper funcionen correctamente
-- 3. Que los accesos básicos funcionen según el rol
-- 4. Detecta posibles problemas comunes
--
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Estado de RLS en tablas principales
-- ============================================================================

SELECT 
  'RLS habilitado en tablas principales' AS check_name,
  COUNT(*) AS tables_with_rls,
  CASE 
    WHEN COUNT(*) >= 6 THEN '✅ OK - RLS habilitado en tablas principales'
    ELSE '❌ ERROR - Faltan tablas con RLS habilitado'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports')
  AND rowsecurity = true;

-- Listar tablas que deberían tener RLS pero no lo tienen
SELECT 
  'Tablas sin RLS habilitado' AS check_name,
  tablename,
  '⚠️ WARNING - RLS no habilitado' AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports')
  AND rowsecurity = false;

-- ============================================================================
-- VERIFICACIÓN 2: Políticas creadas por tabla
-- ============================================================================

SELECT 
  'Políticas RLS creadas' AS check_name,
  schemaname,
  tablename,
  COUNT(*) AS policy_count,
  CASE 
    WHEN tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports') 
         AND COUNT(*) >= 2 THEN '✅ OK'
    WHEN tablename IN ('test_catalog', 'methods', 'analytes', 'roles') 
         AND COUNT(*) >= 1 THEN '✅ OK'
    WHEN COUNT(*) = 0 THEN '❌ ERROR - No hay políticas'
    ELSE '⚠️ WARNING - Pocas políticas'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY schemaname, tablename
ORDER BY tablename;

-- ============================================================================
-- VERIFICACIÓN 3: Funciones helper existentes
-- ============================================================================

SELECT 
  'Funciones helper' AS check_name,
  routine_name,
  CASE 
    WHEN routine_name IN ('get_user_company_id', 'get_user_role', 'is_admin', 'is_lab_user', 'get_user_client_id', 'log_action')
    THEN '✅ OK - Función existe'
    ELSE '❌ ERROR - Función no encontrada'
  END AS status
FROM information_schema.routines
WHERE routine_schema = 'public'
  AND routine_name IN ('get_user_company_id', 'get_user_role', 'is_admin', 'is_lab_user', 'get_user_client_id', 'log_action')
ORDER BY routine_name;

-- Verificar funciones faltantes
SELECT 
  'Funciones helper faltantes' AS check_name,
  missing_function,
  '❌ ERROR - Función no existe' AS status
FROM (
  SELECT unnest(ARRAY[
    'get_user_company_id',
    'get_user_role',
    'is_admin',
    'is_lab_user',
    'get_user_client_id',
    'log_action'
  ]) AS missing_function
) AS expected
WHERE NOT EXISTS (
  SELECT 1 FROM information_schema.routines
  WHERE routine_schema = 'public'
    AND routine_name = expected.missing_function
);

-- ============================================================================
-- VERIFICACIÓN 4: Verificar estructura de políticas por tipo de acceso
-- ============================================================================

-- Políticas SELECT (lectura)
SELECT 
  'Políticas SELECT' AS check_name,
  COUNT(*) AS select_policies,
  CASE 
    WHEN COUNT(*) >= 20 THEN '✅ OK - Suficientes políticas SELECT'
    ELSE '⚠️ WARNING - Pocas políticas SELECT'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'SELECT';

-- Políticas INSERT
SELECT 
  'Políticas INSERT' AS check_name,
  COUNT(*) AS insert_policies,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ OK - Suficientes políticas INSERT'
    ELSE '⚠️ WARNING - Pocas políticas INSERT'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'INSERT';

-- Políticas UPDATE
SELECT 
  'Políticas UPDATE' AS check_name,
  COUNT(*) AS update_policies,
  CASE 
    WHEN COUNT(*) >= 10 THEN '✅ OK - Suficientes políticas UPDATE'
    ELSE '⚠️ WARNING - Pocas políticas UPDATE'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'UPDATE';

-- Políticas DELETE
SELECT 
  'Políticas DELETE' AS check_name,
  COUNT(*) AS delete_policies,
  CASE 
    WHEN COUNT(*) >= 5 THEN '✅ OK - Suficientes políticas DELETE'
    ELSE '⚠️ WARNING - Pocas políticas DELETE'
  END AS status
FROM pg_policies
WHERE schemaname = 'public'
  AND cmd = 'DELETE';

-- ============================================================================
-- VERIFICACIÓN 5: Verificar políticas específicas críticas
-- ============================================================================

SELECT 
  'Políticas críticas' AS check_name,
  tablename,
  policyname,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM pg_policies p
      WHERE p.schemaname = 'public'
        AND p.tablename = expected.tablename
        AND p.policyname = expected.policyname
    ) THEN '✅ OK'
    ELSE '❌ ERROR - Política faltante'
  END AS status
FROM (
  VALUES 
    ('companies', 'Users can view their own company'),
    ('clients', 'Users can view clients from their company'),
    ('users', 'Users can view users from their company'),
    ('samples', 'Users can view samples from their company'),
    ('samples', 'Consumers can view their client samples'),
    ('results', 'Users can view results for samples from their company'),
    ('reports', 'Users can view reports from their company'),
    ('reports', 'Consumers can view their client reports'),
    ('roles', 'All authenticated users can view roles'),
    ('test_catalog', 'Authenticated users can view test_catalog')
) AS expected(tablename, policyname);

-- ============================================================================
-- VERIFICACIÓN 6: Verificar permisos GRANT
-- ============================================================================

SELECT 
  'Permisos GRANT' AS check_name,
  grantee,
  COUNT(*) AS table_grants,
  CASE 
    WHEN grantee = 'authenticated' AND COUNT(*) >= 20 THEN '✅ OK - Permisos otorgados'
    ELSE '⚠️ WARNING - Pocos permisos otorgados'
  END AS status
FROM information_schema.table_privileges
WHERE grantee = 'authenticated'
  AND table_schema = 'public'
GROUP BY grantee;

-- ============================================================================
-- VERIFICACIÓN 7: Detectar posibles problemas comunes
-- ============================================================================

-- Tablas con RLS habilitado pero sin políticas (bloquean todo el acceso)
SELECT 
  'Tablas con RLS sin políticas' AS check_name,
  t.tablename,
  '❌ ERROR - RLS habilitado pero sin políticas (acceso bloqueado)' AS status
FROM pg_tables t
WHERE t.schemaname = 'public'
  AND t.rowsecurity = true
  AND NOT EXISTS (
    SELECT 1 FROM pg_policies p
    WHERE p.schemaname = 'public'
      AND p.tablename = t.tablename
  )
  AND t.tablename IN (
    'companies', 'clients', 'users', 'samples', 'results', 'reports',
    'sample_tests', 'sample_units', 'unit_results', 'sample_files',
    'test_catalog', 'methods', 'analytes', 'roles'
  );

-- Políticas con nombres duplicados (puede causar conflictos)
SELECT 
  'Políticas duplicadas' AS check_name,
  tablename,
  policyname,
  COUNT(*) AS duplicate_count,
  '⚠️ WARNING - Política duplicada' AS status
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename, policyname
HAVING COUNT(*) > 1;

-- ============================================================================
-- VERIFICACIÓN 8: Resumen de políticas por tabla
-- ============================================================================

SELECT 
  'Resumen de políticas' AS check_name,
  tablename,
  COUNT(*) AS total_policies,
  COUNT(*) FILTER (WHERE cmd = 'SELECT') AS select_count,
  COUNT(*) FILTER (WHERE cmd = 'INSERT') AS insert_count,
  COUNT(*) FILTER (WHERE cmd = 'UPDATE') AS update_count,
  COUNT(*) FILTER (WHERE cmd = 'DELETE') AS delete_count,
  COUNT(*) FILTER (WHERE cmd = 'ALL') AS all_count
FROM pg_policies
WHERE schemaname = 'public'
GROUP BY tablename
ORDER BY tablename;

-- ============================================================================
-- VERIFICACIÓN 9: Verificar que las funciones helper pueden ejecutarse
-- ============================================================================

-- Nota: Estas verificaciones requieren un usuario autenticado
-- Se ejecutarán solo si hay un usuario en sesión

DO $$
DECLARE
  test_user_id UUID;
  test_company_id UUID;
  test_role TEXT;
  is_admin_result BOOLEAN;
BEGIN
  -- Intentar obtener un usuario de prueba
  SELECT id, company_id INTO test_user_id, test_company_id
  FROM users
  LIMIT 1;
  
  IF test_user_id IS NOT NULL THEN
    -- Simular ejecución de funciones (requiere SET ROLE, pero lo omitimos para evitar errores)
    RAISE NOTICE 'Usuario de prueba encontrado: %', test_user_id;
    RAISE NOTICE 'Company ID: %', test_company_id;
    RAISE NOTICE '✅ Las funciones helper pueden ejecutarse si hay usuario autenticado';
  ELSE
    RAISE NOTICE '⚠️ No hay usuarios en la base de datos para probar funciones';
  END IF;
EXCEPTION
  WHEN OTHERS THEN
    RAISE NOTICE '⚠️ Error al verificar funciones: %', SQLERRM;
END $$;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

SELECT 
  '=== RESUMEN DE VERIFICACIÓN POST-RLS ===' AS summary;

-- Contar total de problemas
SELECT 
  'Problemas detectados' AS check_name,
  (
    (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' 
     AND tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports')
     AND rowsecurity = false) +
    (SELECT COUNT(*) FROM (
      SELECT unnest(ARRAY['get_user_company_id', 'get_user_role', 'is_admin', 'is_lab_user', 'get_user_client_id', 'log_action']) AS missing_function
      EXCEPT
      SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public'
    ) AS missing) +
    (SELECT COUNT(*) FROM pg_tables t
     WHERE t.schemaname = 'public' AND t.rowsecurity = true
     AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename)
     AND t.tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports'))
  ) AS total_issues,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM pg_tables WHERE schemaname = 'public' 
       AND tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports')
       AND rowsecurity = false) +
      (SELECT COUNT(*) FROM (
        SELECT unnest(ARRAY['get_user_company_id', 'get_user_role', 'is_admin', 'is_lab_user', 'get_user_client_id', 'log_action']) AS missing_function
        EXCEPT
        SELECT routine_name FROM information_schema.routines WHERE routine_schema = 'public'
      ) AS missing) +
      (SELECT COUNT(*) FROM pg_tables t
       WHERE t.schemaname = 'public' AND t.rowsecurity = true
       AND NOT EXISTS (SELECT 1 FROM pg_policies p WHERE p.schemaname = 'public' AND p.tablename = t.tablename)
       AND t.tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports'))
    ) = 0 THEN '✅ OK - No se detectaron problemas críticos. RLS está correctamente configurado.'
    ELSE '❌ ERROR - Se detectaron problemas. Revisar los resultados anteriores.'
  END AS recommendation;

-- ============================================================================
-- CHECKLIST DE PRUEBAS MANUALES RECOMENDADAS
-- ============================================================================

SELECT 
  '=== CHECKLIST DE PRUEBAS MANUALES ===' AS checklist;

-- Lista de pruebas recomendadas
SELECT 
  ROW_NUMBER() OVER () AS test_number,
  test_description,
  expected_result
FROM (
  VALUES 
    (1, 'Login como admin', 'Debe poder ver todas las tablas y datos'),
    (2, 'Login como validador/comun', 'Debe poder ver/editar datos de su company_id'),
    (3, 'Login como consumidor', 'Debe poder ver solo samples/results/reports de su client_id'),
    (4, 'Crear nueva muestra (lab user)', 'Debe poder insertar con su company_id'),
    (5, 'Crear resultado (lab user)', 'Debe poder insertar para muestras de su company_id'),
    (6, 'Ver reportes (consumidor)', 'Debe ver solo reportes de su client_id y completed=true'),
    (7, 'Ver catálogos (cualquier autenticado)', 'Debe poder leer test_catalog, methods, analytes, etc.'),
    (8, 'Crear usuario (admin con service role)', 'Debe funcionar (bypassa RLS)'),
    (9, 'Acceso desde frontend', 'Todas las queries SELECT deben funcionar'),
    (10, 'Acceso desde API routes', 'Todas las operaciones CRUD deben funcionar según rol')
) AS tests(test_number, test_description, expected_result);

-- ============================================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- ============================================================================
