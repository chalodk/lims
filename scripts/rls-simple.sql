-- Políticas RLS simplificadas para desarrollo
-- Ejecutar este script en el SQL Editor de Supabase

-- Primero, eliminar políticas existentes que puedan estar causando conflictos
DROP POLICY IF EXISTS "Users can view users in their company" ON users;
DROP POLICY IF EXISTS "Users can update their own profile" ON users;
DROP POLICY IF EXISTS "Temporary full access for development" ON users;

DROP POLICY IF EXISTS "Users can view their own company" ON companies;
DROP POLICY IF EXISTS "Temporary full access for development" ON companies;

DROP POLICY IF EXISTS "Authenticated users can view roles" ON roles;
DROP POLICY IF EXISTS "Temporary full access for development" ON roles;

-- Políticas simples para desarrollo
-- Permitir acceso completo a usuarios autenticados para las tablas principales

-- Para la tabla users
CREATE POLICY "Allow authenticated users to access users table" ON users
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla companies  
CREATE POLICY "Allow authenticated users to access companies table" ON companies
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla roles
CREATE POLICY "Allow authenticated users to access roles table" ON roles
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla clients
CREATE POLICY "Allow authenticated users to access clients table" ON clients
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla samples
CREATE POLICY "Allow authenticated users to access samples table" ON samples
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla results
CREATE POLICY "Allow authenticated users to access results table" ON results
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla reports
CREATE POLICY "Allow authenticated users to access reports table" ON reports
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla action_logs
CREATE POLICY "Allow authenticated users to access action_logs table" ON action_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- Para la tabla sample_audit_logs
CREATE POLICY "Allow authenticated users to access sample_audit_logs table" ON sample_audit_logs
    FOR ALL USING (auth.role() = 'authenticated');

-- Para las tablas de configuración
CREATE POLICY "Allow authenticated users to access views table" ON views
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to access role_views table" ON role_views
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Allow authenticated users to access permissions table" ON permissions
    FOR ALL USING (auth.role() = 'authenticated'); 