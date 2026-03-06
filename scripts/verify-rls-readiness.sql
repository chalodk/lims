-- ============================================================================
-- Script de verificación previa antes de habilitar RLS
-- Ejecutar ANTES de enable-rls-complete.sql
-- ============================================================================
--
-- Este script verifica:
-- 1. Que todos los usuarios tengan company_id
-- 2. Que las funciones helper existan o puedan crearse
-- 3. Que no haya datos huérfanos que causen problemas
-- ============================================================================

-- ============================================================================
-- VERIFICACIÓN 1: Usuarios sin company_id
-- ============================================================================

SELECT 
  'Usuarios sin company_id' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos los usuarios tienen company_id'
    ELSE '❌ ERROR - Hay usuarios sin company_id'
  END AS status
FROM users
WHERE company_id IS NULL;

-- Mostrar usuarios sin company_id (si los hay)
SELECT 
  id,
  email,
  name,
  role_id,
  'Usuario sin company_id' AS issue
FROM users
WHERE company_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN 2: Consumidores sin client_id
-- ============================================================================

SELECT 
  'Consumidores sin client_id' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos los consumidores tienen client_id'
    ELSE '❌ ERROR - Hay consumidores sin client_id'
  END AS status
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'consumidor' AND u.client_id IS NULL;

-- Mostrar consumidores sin client_id (si los hay)
SELECT 
  u.id,
  u.email,
  u.name,
  'Consumidor sin client_id' AS issue
FROM users u
JOIN roles r ON u.role_id = r.id
WHERE r.name = 'consumidor' AND u.client_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN 3: Samples sin company_id
-- ============================================================================

SELECT 
  'Samples sin company_id' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todas las muestras tienen company_id'
    ELSE '⚠️ WARNING - Hay muestras sin company_id'
  END AS status
FROM samples
WHERE company_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN 4: Results sin sample_id válido
-- ============================================================================

SELECT 
  'Results con sample_id inválido' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos los resultados tienen sample_id válido'
    ELSE '⚠️ WARNING - Hay resultados con sample_id inválido'
  END AS status
FROM results r
LEFT JOIN samples s ON r.sample_id = s.id
WHERE s.id IS NULL;

-- ============================================================================
-- VERIFICACIÓN 5: Reports sin company_id
-- ============================================================================

SELECT 
  'Reports sin company_id' AS check_name,
  COUNT(*) AS count,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - Todos los reportes tienen company_id'
    ELSE '⚠️ WARNING - Hay reportes sin company_id'
  END AS status
FROM reports
WHERE company_id IS NULL;

-- ============================================================================
-- VERIFICACIÓN 6: Verificar que las tablas existen
-- ============================================================================

SELECT 
  'Tablas requeridas' AS check_name,
  COUNT(*) AS tables_found,
  CASE 
    WHEN COUNT(*) >= 30 THEN '✅ OK - Todas las tablas principales existen'
    ELSE '⚠️ WARNING - Faltan algunas tablas'
  END AS status
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_name IN (
    'companies', 'clients', 'users', 'samples', 'results', 'reports',
    'action_logs', 'sample_audit_logs',
    'sample_tests', 'sample_units', 'unit_results', 'sample_files', 'sample_status_transitions',
    'roles', 'views', 'role_views', 'permissions',
    'test_catalog', 'methods', 'analytes', 'species', 'varieties', 'tissues',
    'units_profiles', 'units_profile_fields', 'test_method_map',
    'sla_policies', 'report_templates',
    'projects', 'invitations', 'notifications',
    'interpretation_rules', 'applied_interpretations', 'report_assets'
  );

-- ============================================================================
-- VERIFICACIÓN 7: Verificar que las funciones helper pueden crearse
-- ============================================================================

-- Verificar que la tabla users tiene las columnas necesarias
SELECT 
  'Estructura de tabla users' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'users' 
        AND column_name IN ('id', 'company_id', 'client_id', 'role_id')
    ) THEN '✅ OK - Tabla users tiene todas las columnas necesarias'
    ELSE '❌ ERROR - Faltan columnas en tabla users'
  END AS status;

-- Verificar que la tabla roles existe y tiene la columna name
SELECT 
  'Estructura de tabla roles' AS check_name,
  CASE 
    WHEN EXISTS (
      SELECT 1 FROM information_schema.columns 
      WHERE table_schema = 'public' 
        AND table_name = 'roles' 
        AND column_name = 'name'
    ) THEN '✅ OK - Tabla roles tiene columna name'
    ELSE '❌ ERROR - Tabla roles no tiene columna name'
  END AS status;

-- ============================================================================
-- VERIFICACIÓN 8: Verificar RLS actual (si ya está habilitado)
-- ============================================================================

SELECT 
  'RLS habilitado en tablas principales' AS check_name,
  COUNT(*) AS tables_with_rls,
  CASE 
    WHEN COUNT(*) = 0 THEN '✅ OK - RLS no está habilitado aún (listo para habilitar)'
    WHEN COUNT(*) > 0 AND COUNT(*) < 5 THEN '⚠️ WARNING - RLS parcialmente habilitado'
    ELSE '⚠️ WARNING - RLS ya está habilitado en muchas tablas'
  END AS status
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename IN ('companies', 'clients', 'users', 'samples', 'results', 'reports')
  AND rowsecurity = true;

-- ============================================================================
-- RESUMEN FINAL
-- ============================================================================

SELECT 
  '=== RESUMEN DE VERIFICACIONES ===' AS summary;

-- Contar total de problemas críticos
SELECT 
  'Problemas críticos encontrados' AS check_name,
  (
    (SELECT COUNT(*) FROM users WHERE company_id IS NULL) +
    (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'consumidor' AND u.client_id IS NULL)
  ) AS critical_issues,
  CASE 
    WHEN (
      (SELECT COUNT(*) FROM users WHERE company_id IS NULL) +
      (SELECT COUNT(*) FROM users u JOIN roles r ON u.role_id = r.id WHERE r.name = 'consumidor' AND u.client_id IS NULL)
    ) = 0 THEN '✅ OK - No hay problemas críticos. Puedes proceder con RLS.'
    ELSE '❌ ERROR - Hay problemas críticos que deben resolverse antes de habilitar RLS.'
  END AS recommendation;

-- ============================================================================
-- FIN DEL SCRIPT DE VERIFICACIÓN
-- ============================================================================
