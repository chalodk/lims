-- Configuración de Row Level Security (RLS) para LIMS
-- Ejecutar este script en el SQL Editor de Supabase

-- Habilitar RLS en todas las tablas
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_audit_logs ENABLE ROW LEVEL SECURITY;

-- Políticas para la tabla companies
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view their own company" ON companies
    FOR SELECT USING (auth.uid() IN (
        SELECT id FROM users WHERE company_id = companies.id
    ));

-- Políticas para la tabla users
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view users in their company" ON users
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Permitir actualización de su propio perfil
CREATE POLICY "Users can update their own profile" ON users
    FOR UPDATE USING (id = auth.uid());

-- Políticas para la tabla roles
-- Permitir lectura a todos los usuarios autenticados
CREATE POLICY "Authenticated users can view roles" ON roles
    FOR SELECT USING (auth.role() = 'authenticated');

-- Políticas para la tabla clients
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view clients in their company" ON clients
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Políticas para la tabla samples
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view samples in their company" ON samples
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Políticas para la tabla results
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view results in their company" ON results
    FOR SELECT USING (
        sample_id IN (
            SELECT id FROM samples WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Políticas para la tabla reports
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view reports in their company" ON reports
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Políticas para la tabla action_logs
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view action logs in their company" ON action_logs
    FOR SELECT USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Políticas para la tabla sample_audit_logs
-- Permitir lectura a usuarios autenticados de la misma empresa
CREATE POLICY "Users can view sample audit logs in their company" ON sample_audit_logs
    FOR SELECT USING (
        sample_id IN (
            SELECT id FROM samples WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

-- Políticas para insertar datos (solo para usuarios autenticados)
CREATE POLICY "Authenticated users can insert samples" ON samples
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert results" ON results
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert reports" ON reports
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert action logs" ON action_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "Authenticated users can insert sample audit logs" ON sample_audit_logs
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- Políticas para actualizar datos
CREATE POLICY "Users can update samples in their company" ON samples
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

CREATE POLICY "Users can update results in their company" ON results
    FOR UPDATE USING (
        sample_id IN (
            SELECT id FROM samples WHERE company_id IN (
                SELECT company_id FROM users WHERE id = auth.uid()
            )
        )
    );

CREATE POLICY "Users can update reports in their company" ON reports
    FOR UPDATE USING (
        company_id IN (
            SELECT company_id FROM users WHERE id = auth.uid()
        )
    );

-- Política temporal para permitir acceso completo durante desarrollo
-- (REMOVER EN PRODUCCIÓN)
CREATE POLICY "Temporary full access for development" ON users
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access for development" ON companies
    FOR ALL USING (auth.role() = 'authenticated');

CREATE POLICY "Temporary full access for development" ON roles
    FOR ALL USING (auth.role() = 'authenticated'); 