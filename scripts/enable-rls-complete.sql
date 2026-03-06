-- ============================================================================
-- Script completo para habilitar RLS en todas las tablas del LIMS
-- Basado en el inventario de accesos (RLS_INVENTORY.md)
-- ============================================================================
-- 
-- Este script:
-- 1. Crea funciones helper necesarias (si no existen)
-- 2. Habilita RLS en todas las tablas identificadas
-- 3. Crea políticas de acceso según los patrones identificados (idempotente)
-- 4. Mantiene compatibilidad con el código existente
--
-- NOTA: Este script es IDEMPOTENTE - puede ejecutarse múltiples veces sin errores.
--       Usa DROP POLICY IF EXISTS antes de cada CREATE POLICY para evitar conflictos.
--
-- IMPORTANTE: Ejecutar primero en un entorno de desarrollo/staging
-- ============================================================================

-- ============================================================================
-- PARTE 1: FUNCIONES HELPER
-- ============================================================================

-- Función para obtener el company_id del usuario actual
CREATE OR REPLACE FUNCTION get_user_company_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT company_id 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el rol del usuario actual
CREATE OR REPLACE FUNCTION get_user_role()
RETURNS TEXT AS $$
BEGIN
  RETURN (
    SELECT r.name 
    FROM users u
    JOIN roles r ON u.role_id = r.id
    WHERE u.id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para verificar si el usuario es lab user (admin, validador, comun)
CREATE OR REPLACE FUNCTION is_lab_user()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() IN ('admin', 'validador', 'comun');
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para obtener el client_id del usuario actual (para consumidores)
CREATE OR REPLACE FUNCTION get_user_client_id()
RETURNS UUID AS $$
BEGIN
  RETURN (
    SELECT client_id 
    FROM users 
    WHERE id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Función para registrar acciones (usada por log_action RPC)
CREATE OR REPLACE FUNCTION log_action(
  action_text TEXT,
  target_table_name TEXT DEFAULT NULL,
  target_record_id UUID DEFAULT NULL,
  metadata_json JSONB DEFAULT NULL
)
RETURNS VOID AS $$
BEGIN
  INSERT INTO action_logs (
    user_id,
    company_id,
    action,
    target_table,
    target_id,
    metadata
  ) VALUES (
    auth.uid(),
    get_user_company_id(),
    action_text,
    target_table_name,
    target_record_id,
    metadata_json
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- PARTE 2: HABILITAR RLS EN TODAS LAS TABLAS
-- ============================================================================

-- Tablas principales
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

-- Tablas de auditoría y logs
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_audit_logs ENABLE ROW LEVEL SECURITY;

-- Tablas relacionadas con muestras
ALTER TABLE sample_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_units ENABLE ROW LEVEL SECURITY;
ALTER TABLE unit_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_files ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_status_transitions ENABLE ROW LEVEL SECURITY;

-- Tablas de sistema y configuración
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

-- Tablas de catálogo (solo lectura para autenticados)
ALTER TABLE test_catalog ENABLE ROW LEVEL SECURITY;
ALTER TABLE methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE analytes ENABLE ROW LEVEL SECURITY;
ALTER TABLE species ENABLE ROW LEVEL SECURITY;
ALTER TABLE varieties ENABLE ROW LEVEL SECURITY;
ALTER TABLE tissues ENABLE ROW LEVEL SECURITY;
ALTER TABLE units_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE units_profile_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE test_method_map ENABLE ROW LEVEL SECURITY;
ALTER TABLE sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_templates ENABLE ROW LEVEL SECURITY;

-- Tablas de negocio
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE interpretation_rules ENABLE ROW LEVEL SECURITY;
ALTER TABLE applied_interpretations ENABLE ROW LEVEL SECURITY;
ALTER TABLE report_assets ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PARTE 3: POLÍTICAS PARA TABLAS PRINCIPALES
-- ============================================================================

-- ============================================================================
-- COMPANIES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Only admins can insert companies" ON companies;
CREATE POLICY "Only admins can insert companies" ON companies
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Only admins can update companies" ON companies;
CREATE POLICY "Only admins can update companies" ON companies
  FOR UPDATE USING (is_admin());

-- ============================================================================
-- CLIENTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view clients from their company" ON clients;
CREATE POLICY "Users can view clients from their company" ON clients
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view their own client" ON clients;
CREATE POLICY "Consumers can view their own client" ON clients
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND 
    id = get_user_client_id()
  );

DROP POLICY IF EXISTS "Users can insert clients for their company" ON clients;
CREATE POLICY "Users can insert clients for their company" ON clients
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can update clients from their company" ON clients;
CREATE POLICY "Users can update clients from their company" ON clients
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- ============================================================================
-- USERS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view users from their company" ON users;
CREATE POLICY "Users can view users from their company" ON users
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin() OR id = auth.uid()
  );

DROP POLICY IF EXISTS "Consumers can view their own profile" ON users;
CREATE POLICY "Consumers can view their own profile" ON users
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND id = auth.uid()
  );

DROP POLICY IF EXISTS "Users can update their own profile" ON users;
CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (
    id = auth.uid() OR is_admin()
  );

DROP POLICY IF EXISTS "Admins can insert users" ON users;
CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (is_admin());

DROP POLICY IF EXISTS "Admins can delete users" ON users;
CREATE POLICY "Admins can delete users" ON users
  FOR DELETE USING (is_admin());

-- ============================================================================
-- SAMPLES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view samples from their company" ON samples;
CREATE POLICY "Users can view samples from their company" ON samples
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view their client samples" ON samples;
DROP POLICY IF EXISTS "Consumers can view their own samples" ON samples;
CREATE POLICY "Consumers can view their client samples" ON samples
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND 
    client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "Users can insert samples for their company" ON samples;
CREATE POLICY "Users can insert samples for their company" ON samples
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can update samples from their company" ON samples;
CREATE POLICY "Users can update samples from their company" ON samples
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can delete samples from their company" ON samples;
CREATE POLICY "Users can delete samples from their company" ON samples
  FOR DELETE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- ============================================================================
-- RESULTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view results for samples from their company" ON results;
CREATE POLICY "Users can view results for samples from their company" ON results
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view results for their client samples" ON results;
CREATE POLICY "Consumers can view results for their client samples" ON results
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_id IN (
      SELECT id FROM samples 
      WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert results" ON results;
CREATE POLICY "Lab users can insert results" ON results
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can update results" ON results;
CREATE POLICY "Lab users can update results" ON results
  FOR UPDATE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete results" ON results;
CREATE POLICY "Lab users can delete results" ON results
  FOR DELETE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- REPORTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view reports from their company" ON reports;
CREATE POLICY "Users can view reports from their company" ON reports
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view their client reports" ON reports;
CREATE POLICY "Consumers can view their client reports" ON reports
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND 
    client_id = get_user_client_id()
  );

DROP POLICY IF EXISTS "Lab users can insert reports" ON reports;
CREATE POLICY "Lab users can insert reports" ON reports
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    company_id = get_user_company_id()
  );

DROP POLICY IF EXISTS "Lab users can update reports" ON reports;
CREATE POLICY "Lab users can update reports" ON reports
  FOR UPDATE USING (
    is_lab_user() AND
    company_id = get_user_company_id()
  );

DROP POLICY IF EXISTS "Lab users can delete reports" ON reports;
CREATE POLICY "Lab users can delete reports" ON reports
  FOR DELETE USING (
    is_lab_user() AND
    company_id = get_user_company_id()
  );

-- ============================================================================
-- PARTE 4: POLÍTICAS PARA TABLAS RELACIONADAS CON MUESTRAS
-- ============================================================================

-- ============================================================================
-- SAMPLE_TESTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sample_tests for their company samples" ON sample_tests;
CREATE POLICY "Users can view sample_tests for their company samples" ON sample_tests
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view sample_tests for their client samples" ON sample_tests;
CREATE POLICY "Consumers can view sample_tests for their client samples" ON sample_tests
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_id IN (
      SELECT id FROM samples WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert sample_tests" ON sample_tests;
CREATE POLICY "Lab users can insert sample_tests" ON sample_tests
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can update sample_tests" ON sample_tests;
CREATE POLICY "Lab users can update sample_tests" ON sample_tests
  FOR UPDATE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete sample_tests" ON sample_tests;
CREATE POLICY "Lab users can delete sample_tests" ON sample_tests
  FOR DELETE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- SAMPLE_UNITS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sample_units for their company samples" ON sample_units;
CREATE POLICY "Users can view sample_units for their company samples" ON sample_units
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view sample_units for their client samples" ON sample_units;
CREATE POLICY "Consumers can view sample_units for their client samples" ON sample_units
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_id IN (
      SELECT id FROM samples WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert sample_units" ON sample_units;
CREATE POLICY "Lab users can insert sample_units" ON sample_units
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can update sample_units" ON sample_units;
CREATE POLICY "Lab users can update sample_units" ON sample_units
  FOR UPDATE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete sample_units" ON sample_units;
CREATE POLICY "Lab users can delete sample_units" ON sample_units
  FOR DELETE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- UNIT_RESULTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view unit_results for their company samples" ON unit_results;
CREATE POLICY "Users can view unit_results for their company samples" ON unit_results
  FOR SELECT USING (
    sample_unit_id IN (
      SELECT su.id FROM sample_units su
      JOIN samples s ON su.sample_id = s.id
      WHERE s.company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view unit_results for their client samples" ON unit_results;
CREATE POLICY "Consumers can view unit_results for their client samples" ON unit_results
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_unit_id IN (
      SELECT su.id FROM sample_units su
      JOIN samples s ON su.sample_id = s.id
      WHERE s.client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert unit_results" ON unit_results;
CREATE POLICY "Lab users can insert unit_results" ON unit_results
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_unit_id IN (
      SELECT su.id FROM sample_units su
      JOIN samples s ON su.sample_id = s.id
      WHERE s.company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can update unit_results" ON unit_results;
CREATE POLICY "Lab users can update unit_results" ON unit_results
  FOR UPDATE USING (
    is_lab_user() AND
    sample_unit_id IN (
      SELECT su.id FROM sample_units su
      JOIN samples s ON su.sample_id = s.id
      WHERE s.company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete unit_results" ON unit_results;
CREATE POLICY "Lab users can delete unit_results" ON unit_results
  FOR DELETE USING (
    is_lab_user() AND
    sample_unit_id IN (
      SELECT su.id FROM sample_units su
      JOIN samples s ON su.sample_id = s.id
      WHERE s.company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- SAMPLE_FILES
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sample_files for their company samples" ON sample_files;
CREATE POLICY "Users can view sample_files for their company samples" ON sample_files
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view sample_files for their client samples" ON sample_files;
CREATE POLICY "Consumers can view sample_files for their client samples" ON sample_files
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_id IN (
      SELECT id FROM samples WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert sample_files" ON sample_files;
CREATE POLICY "Lab users can insert sample_files" ON sample_files
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete sample_files" ON sample_files;
CREATE POLICY "Lab users can delete sample_files" ON sample_files
  FOR DELETE USING (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- SAMPLE_STATUS_TRANSITIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sample_status_transitions for their company samples" ON sample_status_transitions;
CREATE POLICY "Users can view sample_status_transitions for their company samples" ON sample_status_transitions
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Lab users can insert sample_status_transitions" ON sample_status_transitions;
CREATE POLICY "Lab users can insert sample_status_transitions" ON sample_status_transitions
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- PARTE 5: POLÍTICAS PARA TABLAS DE CATÁLOGO (SOLO LECTURA)
-- ============================================================================

-- Todas las tablas de catálogo: solo lectura para usuarios autenticados

DROP POLICY IF EXISTS "Authenticated users can view test_catalog" ON test_catalog;
CREATE POLICY "Authenticated users can view test_catalog" ON test_catalog
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view methods" ON methods;
CREATE POLICY "Authenticated users can view methods" ON methods
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view analytes" ON analytes;
CREATE POLICY "Authenticated users can view analytes" ON analytes
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view species" ON species;
CREATE POLICY "Authenticated users can view species" ON species
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view varieties" ON varieties;
CREATE POLICY "Authenticated users can view varieties" ON varieties
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view tissues" ON tissues;
CREATE POLICY "Authenticated users can view tissues" ON tissues
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view units_profiles" ON units_profiles;
CREATE POLICY "Authenticated users can view units_profiles" ON units_profiles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view units_profile_fields" ON units_profile_fields;
CREATE POLICY "Authenticated users can view units_profile_fields" ON units_profile_fields
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view test_method_map" ON test_method_map;
CREATE POLICY "Authenticated users can view test_method_map" ON test_method_map
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view sla_policies" ON sla_policies;
CREATE POLICY "Authenticated users can view sla_policies" ON sla_policies
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Authenticated users can view report_templates" ON report_templates;
CREATE POLICY "Authenticated users can view report_templates" ON report_templates
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Solo admins pueden modificar catálogos
DROP POLICY IF EXISTS "Only admins can modify test_catalog" ON test_catalog;
CREATE POLICY "Only admins can modify test_catalog" ON test_catalog
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify methods" ON methods;
CREATE POLICY "Only admins can modify methods" ON methods
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify analytes" ON analytes;
CREATE POLICY "Only admins can modify analytes" ON analytes
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify species" ON species;
CREATE POLICY "Only admins can modify species" ON species
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify varieties" ON varieties;
CREATE POLICY "Only admins can modify varieties" ON varieties
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify tissues" ON tissues;
CREATE POLICY "Only admins can modify tissues" ON tissues
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify units_profiles" ON units_profiles;
CREATE POLICY "Only admins can modify units_profiles" ON units_profiles
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify units_profile_fields" ON units_profile_fields;
CREATE POLICY "Only admins can modify units_profile_fields" ON units_profile_fields
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify test_method_map" ON test_method_map;
CREATE POLICY "Only admins can modify test_method_map" ON test_method_map
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify sla_policies" ON sla_policies;
CREATE POLICY "Only admins can modify sla_policies" ON sla_policies
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify report_templates" ON report_templates;
CREATE POLICY "Only admins can modify report_templates" ON report_templates
  FOR ALL USING (is_admin());

-- ============================================================================
-- PARTE 6: POLÍTICAS PARA TABLAS DE SISTEMA Y CONFIGURACIÓN
-- ============================================================================

-- ============================================================================
-- ROLES, VIEWS, ROLE_VIEWS, PERMISSIONS
-- ============================================================================

DROP POLICY IF EXISTS "All authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
CREATE POLICY "All authenticated users can view roles" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All authenticated users can view views" ON views;
DROP POLICY IF EXISTS "Authenticated users can view views" ON views;
CREATE POLICY "All authenticated users can view views" ON views
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All authenticated users can view role_views" ON role_views;
DROP POLICY IF EXISTS "Authenticated users can view role_views" ON role_views;
CREATE POLICY "All authenticated users can view role_views" ON role_views
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "All authenticated users can view permissions" ON permissions;
DROP POLICY IF EXISTS "Authenticated users can view permissions" ON permissions;
CREATE POLICY "All authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can modify roles" ON roles;
CREATE POLICY "Only admins can modify roles" ON roles
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify views" ON views;
CREATE POLICY "Only admins can modify views" ON views
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify role_views" ON role_views;
CREATE POLICY "Only admins can modify role_views" ON role_views
  FOR ALL USING (is_admin());

DROP POLICY IF EXISTS "Only admins can modify permissions" ON permissions;
CREATE POLICY "Only admins can modify permissions" ON permissions
  FOR ALL USING (is_admin());

-- ============================================================================
-- PROJECTS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view projects from their company" ON projects;
CREATE POLICY "Users can view projects from their company" ON projects
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can insert projects for their company" ON projects;
CREATE POLICY "Users can insert projects for their company" ON projects
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can update projects from their company" ON projects;
CREATE POLICY "Users can update projects from their company" ON projects
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can delete projects from their company" ON projects;
CREATE POLICY "Users can delete projects from their company" ON projects
  FOR DELETE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- ============================================================================
-- INVITATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view invitations from their company" ON invitations;
CREATE POLICY "Users can view invitations from their company" ON invitations
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can insert invitations for their company" ON invitations;
CREATE POLICY "Users can insert invitations for their company" ON invitations
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Users can update invitations from their company" ON invitations;
CREATE POLICY "Users can update invitations from their company" ON invitations
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- ============================================================================
-- NOTIFICATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view notifications from their company" ON notifications;
CREATE POLICY "Users can view notifications from their company" ON notifications
  FOR SELECT USING (
    to_ref->>'email' = (SELECT email FROM users WHERE id = auth.uid())
    OR is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can insert notifications" ON notifications;
CREATE POLICY "Authenticated users can insert notifications" ON notifications
  FOR INSERT WITH CHECK (auth.uid() IS NOT NULL);

-- ============================================================================
-- INTERPRETATION_RULES
-- ============================================================================

DROP POLICY IF EXISTS "Authenticated users can view interpretation_rules" ON interpretation_rules;
CREATE POLICY "Authenticated users can view interpretation_rules" ON interpretation_rules
  FOR SELECT USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "Only admins can modify interpretation_rules" ON interpretation_rules;
CREATE POLICY "Only admins can modify interpretation_rules" ON interpretation_rules
  FOR ALL USING (is_admin());

-- ============================================================================
-- APPLIED_INTERPRETATIONS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view applied_interpretations for their company samples" ON applied_interpretations;
CREATE POLICY "Users can view applied_interpretations for their company samples" ON applied_interpretations
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view applied_interpretations for their client samples" ON applied_interpretations;
CREATE POLICY "Consumers can view applied_interpretations for their client samples" ON applied_interpretations
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    sample_id IN (
      SELECT id FROM samples WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert applied_interpretations" ON applied_interpretations;
CREATE POLICY "Lab users can insert applied_interpretations" ON applied_interpretations
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- REPORT_ASSETS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view report_assets for their company reports" ON report_assets;
CREATE POLICY "Users can view report_assets for their company reports" ON report_assets
  FOR SELECT USING (
    report_id IN (
      SELECT id FROM reports WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Consumers can view report_assets for their client reports" ON report_assets;
CREATE POLICY "Consumers can view report_assets for their client reports" ON report_assets
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND
    report_id IN (
      SELECT id FROM reports WHERE client_id = get_user_client_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can insert report_assets" ON report_assets;
CREATE POLICY "Lab users can insert report_assets" ON report_assets
  FOR INSERT WITH CHECK (
    is_lab_user() AND
    report_id IN (
      SELECT id FROM reports WHERE company_id = get_user_company_id()
    )
  );

DROP POLICY IF EXISTS "Lab users can delete report_assets" ON report_assets;
CREATE POLICY "Lab users can delete report_assets" ON report_assets
  FOR DELETE USING (
    is_lab_user() AND
    report_id IN (
      SELECT id FROM reports WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- PARTE 7: POLÍTICAS PARA TABLAS DE AUDITORÍA
-- ============================================================================

-- ============================================================================
-- ACTION_LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view action_logs from their company" ON action_logs;
DROP POLICY IF EXISTS "Users can view action logs from their company" ON action_logs;
CREATE POLICY "Users can view action_logs from their company" ON action_logs
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can insert action_logs" ON action_logs;
DROP POLICY IF EXISTS "Authenticated users can insert action logs" ON action_logs;
CREATE POLICY "Authenticated users can insert action_logs" ON action_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (company_id = get_user_company_id() OR is_admin())
  );

-- ============================================================================
-- SAMPLE_AUDIT_LOGS
-- ============================================================================

DROP POLICY IF EXISTS "Users can view sample_audit_logs for their company samples" ON sample_audit_logs;
DROP POLICY IF EXISTS "Users can view sample audit logs for their company samples" ON sample_audit_logs;
CREATE POLICY "Users can view sample_audit_logs for their company samples" ON sample_audit_logs
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

DROP POLICY IF EXISTS "Authenticated users can insert sample_audit_logs" ON sample_audit_logs;
DROP POLICY IF EXISTS "Authenticated users can insert sample audit logs" ON sample_audit_logs;
CREATE POLICY "Authenticated users can insert sample_audit_logs" ON sample_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- ============================================================================
-- PARTE 8: PERMISOS Y GRANTS
-- ============================================================================

-- Otorgar permisos necesarios a usuarios autenticados
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO authenticated;

-- ============================================================================
-- FIN DEL SCRIPT
-- ============================================================================
--
-- NOTAS IMPORTANTES:
--
-- 1. Service Role Key: El código que usa SUPABASE_SERVICE_ROLE_KEY
--    automáticamente bypassa RLS, por lo que no necesita políticas especiales.
--
-- 2. Funciones SECURITY DEFINER: Las funciones helper (get_user_company_id,
--    get_user_role, etc.) se ejecutan con privilegios del creador y bypassan
--    RLS, lo cual es necesario para que funcionen correctamente.
--
-- 3. Validaciones en aplicación: Este script NO reemplaza las validaciones
--    de roles en el código de la aplicación. Ambas capas (app + DB) deben
--    trabajar juntas para defensa en profundidad.
--
-- 4. Testing: Después de ejecutar este script, probar:
--    - Login y autenticación
--    - Lectura de datos desde frontend
--    - Creación/edición de muestras, resultados, reportes
--    - Acceso de consumidores a sus datos
--    - Creación de usuarios (service role)
--    - Cron jobs (si usan anon key con usuario autenticado)
--
-- 5. Rollback: Si necesitas deshabilitar RLS temporalmente, usar:
--    ALTER TABLE <table_name> DISABLE ROW LEVEL SECURITY;
--    O ejecutar scripts/disable-rls.sql
--
-- ============================================================================
