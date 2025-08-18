-- Script para verificar que el usuario existe correctamente
-- Ejecutar este script en el SQL Editor de Supabase

-- Verificar que el usuario existe en la tabla users
SELECT 
    u.id,
    u.name,
    u.email,
    u.company_id,
    u.role_id,
    c.name as company_name,
    r.name as role_name,
    r.level as role_level
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca';

-- Verificar que la empresa existe
SELECT * FROM companies WHERE name = 'test_company';

-- Verificar que los roles existen
SELECT * FROM roles;

-- Si el usuario no existe, insertarlo
-- (Descomenta y ejecuta si es necesario)
/*
INSERT INTO companies (name) 
VALUES ('test_company') 
ON CONFLICT (name) DO NOTHING;

INSERT INTO users (id, company_id, role_id, name, email) 
VALUES (
    '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca',
    (SELECT id FROM companies WHERE name = 'test_company'),
    1, -- role_id para admin
    'G. Arellano',
    'g.arellano@agroanalytics.cl'
) ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    company_id = EXCLUDED.company_id,
    role_id = EXCLUDED.role_id;
*/ 