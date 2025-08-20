-- Test user creation directly in database
-- Run this in Supabase SQL Editor

-- First, create a default company if it doesn't exist
INSERT INTO companies (name) 
VALUES ('Default Company') 
ON CONFLICT (name) DO NOTHING;

-- Get the company ID
SELECT id, name FROM companies WHERE name = 'Default Company';

-- Create user profile directly (replace the UUID with your actual user ID from console)
INSERT INTO users (id, email, name, company_id, role_id) 
VALUES (
    'ecb1ac60-4cd7-4bd1-a26b-f55b3be05dae',
    'garellano.consultor@gmail.com',
    'G. Arellano',
    (SELECT id FROM companies WHERE name = 'Default Company'),
    1
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    company_id = EXCLUDED.company_id,
    role_id = EXCLUDED.role_id;

-- Verify the user was created
SELECT 
    u.id,
    u.name,
    u.email,
    u.company_id,
    u.role_id,
    c.name as company_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
WHERE u.id = 'ecb1ac60-4cd7-4bd1-a26b-f55b3be05dae';