-- Enable RLS on all tables
ALTER TABLE companies ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE samples ENABLE ROW LEVEL SECURITY;
ALTER TABLE results ENABLE ROW LEVEL SECURITY;
ALTER TABLE reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE action_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE sample_audit_logs ENABLE ROW LEVEL SECURITY;

-- Helper function to get current user's company_id
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

-- Helper function to get current user's role
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

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN get_user_role() = 'admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Companies RLS Policies
CREATE POLICY "Users can view their own company" ON companies
  FOR SELECT USING (
    id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Only admins can insert companies" ON companies
  FOR INSERT WITH CHECK (is_admin());

CREATE POLICY "Only admins can update companies" ON companies
  FOR UPDATE USING (is_admin());

-- Clients RLS Policies
CREATE POLICY "Users can view clients from their company" ON clients
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Users can insert clients for their company" ON clients
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Users can update clients from their company" ON clients
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- Users RLS Policies
CREATE POLICY "Users can view users from their company" ON users
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin() OR id = auth.uid()
  );

CREATE POLICY "Users can update their own profile" ON users
  FOR UPDATE USING (
    id = auth.uid() OR is_admin()
  );

CREATE POLICY "Admins can insert users" ON users
  FOR INSERT WITH CHECK (is_admin());

-- Samples RLS Policies
CREATE POLICY "Users can view samples from their company" ON samples
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Users can insert samples for their company" ON samples
  FOR INSERT WITH CHECK (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Users can update samples from their company" ON samples
  FOR UPDATE USING (
    company_id = get_user_company_id() OR is_admin()
  );

-- Role-specific sample access for consumers (clients)
CREATE POLICY "Consumers can view their own samples" ON samples
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND 
    client_id IN (
      SELECT id FROM clients WHERE id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Results RLS Policies
CREATE POLICY "Users can view results for samples from their company" ON results
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

CREATE POLICY "Lab users can insert results" ON results
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'validador', 'comun') AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

CREATE POLICY "Lab users can update results" ON results
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'validador', 'comun') AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- Reports RLS Policies
CREATE POLICY "Users can view reports from their company" ON reports
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Lab users can insert reports" ON reports
  FOR INSERT WITH CHECK (
    get_user_role() IN ('admin', 'validador', 'comun') AND
    company_id = get_user_company_id()
  );

CREATE POLICY "Lab users can update reports" ON reports
  FOR UPDATE USING (
    get_user_role() IN ('admin', 'validador', 'comun') AND
    company_id = get_user_company_id()
  );

-- Consumers can view their own reports
CREATE POLICY "Consumers can view their client reports" ON reports
  FOR SELECT USING (
    get_user_role() = 'consumidor' AND 
    client_id IN (
      SELECT id FROM clients WHERE id = (
        SELECT client_id FROM users WHERE id = auth.uid()
      )
    )
  );

-- Action Logs RLS Policies
CREATE POLICY "Users can view action logs from their company" ON action_logs
  FOR SELECT USING (
    company_id = get_user_company_id() OR is_admin()
  );

CREATE POLICY "Authenticated users can insert action logs" ON action_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    (company_id = get_user_company_id() OR is_admin())
  );

-- Sample Audit Logs RLS Policies
CREATE POLICY "Users can view sample audit logs for their company samples" ON sample_audit_logs
  FOR SELECT USING (
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    ) OR is_admin()
  );

CREATE POLICY "Authenticated users can insert sample audit logs" ON sample_audit_logs
  FOR INSERT WITH CHECK (
    auth.uid() IS NOT NULL AND
    sample_id IN (
      SELECT id FROM samples WHERE company_id = get_user_company_id()
    )
  );

-- Roles and Views tables (read-only for all authenticated users)
ALTER TABLE roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE views ENABLE ROW LEVEL SECURITY;
ALTER TABLE role_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE permissions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "All authenticated users can view roles" ON roles
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view views" ON views
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view role_views" ON role_views
  FOR SELECT USING (auth.uid() IS NOT NULL);

CREATE POLICY "All authenticated users can view permissions" ON permissions
  FOR SELECT USING (auth.uid() IS NOT NULL);

-- Only admins can modify role-related tables
CREATE POLICY "Only admins can modify roles" ON roles
  FOR ALL USING (is_admin());

CREATE POLICY "Only admins can modify views" ON views
  FOR ALL USING (is_admin());

CREATE POLICY "Only admins can modify role_views" ON role_views
  FOR ALL USING (is_admin());

CREATE POLICY "Only admins can modify permissions" ON permissions
  FOR ALL USING (is_admin());

-- Grant necessary permissions to authenticated users
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO authenticated;

-- Create function to log actions automatically
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