
-- Tabla de empresas que contratan el sistema
CREATE TABLE companies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de roles específicos para el laboratorio
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name TEXT UNIQUE NOT NULL CHECK (name IN ('admin', 'validador', 'comun', 'consumidor')),
    level INTEGER NOT NULL,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Insertar roles por defecto
INSERT INTO roles (name, level, description) VALUES
    ('admin', 4, 'Administrador del sistema con acceso completo'),
    ('validador', 3, 'Puede validar resultados y generar informes'),
    ('comun', 2, 'Usuario del laboratorio con acceso limitado'),
    ('consumidor', 1, 'Cliente con acceso solo a sus muestras e informes');

-- Tabla de vistas disponibles en la UI
CREATE TABLE views (
    id SERIAL PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    label TEXT,
    path TEXT,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Relación entre roles y vistas
CREATE TABLE role_views (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    view_id INTEGER REFERENCES views(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de permisos por acción
CREATE TABLE permissions (
    id SERIAL PRIMARY KEY,
    role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
    action TEXT NOT NULL,
    allowed BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de clientes (clientes de las empresas usuarias del sistema)
CREATE TABLE clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    company_id UUID REFERENCES companies(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    rut TEXT,
    contact_email TEXT,
    phone TEXT,
    address TEXT,
    client_type TEXT CHECK (client_type IN ('farmer', 'agricultural_company', 'research_institution', 'government_agency', 'consultant')),
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de usuarios autenticados (enlace a Supabase Auth por UUID)
CREATE TABLE users (
    id UUID PRIMARY KEY REFERENCES auth.users(id),
    company_id UUID REFERENCES companies(id),
    client_id UUID REFERENCES clients(id),
    role_id INTEGER REFERENCES roles(id),
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    specialization TEXT,
    avatar TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de logs de acciones
CREATE TABLE action_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id UUID REFERENCES users(id),
    company_id UUID REFERENCES companies(id),
    action TEXT NOT NULL,
    target_table TEXT,
    target_id UUID,
    metadata JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de muestras
CREATE TABLE samples (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    client_id UUID REFERENCES clients(id),
    company_id UUID REFERENCES companies(id),
    code TEXT UNIQUE NOT NULL,
    received_date DATE NOT NULL,
    registered_date DATE NOT NULL DEFAULT CURRENT_DATE,
    priority TEXT CHECK (priority IN ('normal', 'express', 'urgent')) DEFAULT 'normal',
    species TEXT NOT NULL,
    variety TEXT,
    rootstock TEXT,
    planting_year INTEGER,
    previous_crop TEXT,
    next_crop TEXT,
    fallow BOOLEAN DEFAULT FALSE,
    tissue_type TEXT CHECK (tissue_type IN ('leaf', 'stem', 'root', 'fruit', 'seed', 'soil', 'whole_plant', 'other')),
    symptoms TEXT,
    collection_location TEXT,
    environmental_conditions TEXT,
    client_notes TEXT,
    reception_notes TEXT,
    taken_by TEXT CHECK (taken_by IN ('client', 'lab')),
    delivery_method TEXT,
    suspected_pathogen TEXT,
    requested_tests TEXT[] NOT NULL, -- ['ELISA', 'PCR', etc.]
    status TEXT CHECK (status IN ('received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis', 'validation', 'completed')) DEFAULT 'received',
    assigned_to UUID REFERENCES users(id),
    images TEXT[],
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de informes (1:1 con muestras)
CREATE TABLE reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID UNIQUE REFERENCES samples(id) ON DELETE CASCADE,
    client_id UUID REFERENCES clients(id),
    company_id UUID REFERENCES companies(id),
    delivery_date DATE,
    template TEXT CHECK (template IN ('standard', 'regulatory', 'summary', 'detailed')),
    generated_by UUID REFERENCES users(id),
    completed BOOLEAN DEFAULT FALSE,
    responsible_id UUID REFERENCES users(id),
    status TEXT CHECK (status IN ('draft', 'generated', 'sent')) DEFAULT 'draft',
    include_recommendations BOOLEAN DEFAULT TRUE,
    include_images BOOLEAN DEFAULT TRUE,
    download_url TEXT,
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de resultados de análisis
CREATE TABLE results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    test_type TEXT CHECK (test_type IN (
        'Visual Inspection', 'Cultural Isolation', 'Molecular PCR',
        'Pathogenicity Test', 'ELISA', 'Microscopy', 'Biochemical Tests',
        'Sequencing', 'Serology', 'Immunofluorescence'
    )),
    methodology TEXT NOT NULL,
    findings JSONB, -- [{"species": "...", "quantity": ..., "unit": "..."}]
    conclusion TEXT,
    diagnosis TEXT,
    pathogen_identified TEXT,
    pathogen_type TEXT CHECK (pathogen_type IN ('fungus', 'bacteria', 'virus', 'nematode', 'insect', 'abiotic', 'unknown')),
    severity TEXT CHECK (severity IN ('low', 'moderate', 'high', 'severe')),
    confidence TEXT CHECK (confidence IN ('low', 'medium', 'high')),
    result_type TEXT CHECK (result_type IN ('positive', 'negative')),
    is_pathogen_present BOOLEAN,
    microscopic_observations TEXT,
    cultural_characteristics TEXT,
    molecular_results TEXT,
    recommendations TEXT,
    images TEXT[],
    comments TEXT,
    performed_by UUID REFERENCES users(id),
    performed_at TIMESTAMPTZ DEFAULT now(),
    validated_by UUID REFERENCES users(id),
    validation_date TIMESTAMPTZ,
    status TEXT CHECK (status IN ('pending', 'completed', 'validated')) DEFAULT 'pending',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tabla de auditoría específica para muestras
CREATE TABLE sample_audit_logs (
    id BIGSERIAL PRIMARY KEY,
    sample_id UUID REFERENCES samples(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action TEXT NOT NULL,
    old_values JSONB,
    new_values JSONB,
    created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para mejorar rendimiento
CREATE INDEX idx_samples_client_id ON samples(client_id);
CREATE INDEX idx_samples_company_id ON samples(company_id);
CREATE INDEX idx_samples_status ON samples(status);
CREATE INDEX idx_samples_assigned_to ON samples(assigned_to);
CREATE INDEX idx_results_sample_id ON results(sample_id);
CREATE INDEX idx_results_validated_by ON results(validated_by);
CREATE INDEX idx_reports_sample_id ON reports(sample_id);
CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_users_company_id ON users(company_id);

-- Triggers para auditoría automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = now();
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_samples_updated_at BEFORE UPDATE ON samples
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_reports_updated_at BEFORE UPDATE ON reports
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_results_updated_at BEFORE UPDATE ON results
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
