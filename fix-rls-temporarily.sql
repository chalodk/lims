-- TEMPORARY FIX: Disable RLS for development
-- Run this in Supabase SQL Editor to fix the clients page loading issue

-- First, check current RLS status
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'roles', 'clients', 'samples', 'results', 'reports');

-- Disable RLS on critical tables for development
ALTER TABLE IF EXISTS users DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS companies DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS roles DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS clients DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS samples DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS results DISABLE ROW LEVEL SECURITY;
ALTER TABLE IF EXISTS reports DISABLE ROW LEVEL SECURITY;

-- Ensure basic tables exist (create if missing)
CREATE TABLE IF NOT EXISTS companies (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    created_at timestamptz DEFAULT now()
);

-- Check if roles table exists, if not create it
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'roles') THEN
        CREATE TABLE roles (
            id bigint PRIMARY KEY GENERATED ALWAYS AS IDENTITY,
            name text NOT NULL UNIQUE,
            level int DEFAULT 1,
            created_at timestamptz DEFAULT now()
        );
    END IF;
END $$;

-- Insert default role if not exists (handle different id column types)
DO $$
BEGIN
    -- Try to insert with explicit id first (for existing tables with serial/bigserial)
    IF NOT EXISTS (SELECT 1 FROM roles WHERE name = 'admin') THEN
        BEGIN
            INSERT INTO roles (id, name, level) VALUES (1, 'admin', 100);
        EXCEPTION WHEN others THEN
            -- If that fails, try without specifying id (for GENERATED ALWAYS AS IDENTITY)
            INSERT INTO roles (name, level) VALUES ('admin', 100);
        END;
    END IF;
END $$;

CREATE TABLE IF NOT EXISTS users (
    id uuid PRIMARY KEY,
    email text,
    name text,
    company_id uuid REFERENCES companies(id),
    role_id bigint REFERENCES roles(id) DEFAULT 1,
    created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clients (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL,
    rut text,
    contact_email text,
    phone text,
    address text,
    client_type text DEFAULT 'farmer',
    company_id uuid REFERENCES companies(id),
    created_at timestamptz DEFAULT now()
);

-- Verify tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('users', 'companies', 'roles', 'clients')
ORDER BY table_name;

-- Check RLS status again
SELECT 
    schemaname,
    tablename,
    rowsecurity
FROM pg_tables 
WHERE schemaname = 'public' 
AND tablename IN ('users', 'companies', 'roles', 'clients', 'samples', 'results', 'reports');