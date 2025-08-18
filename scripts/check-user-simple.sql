-- Query simple para verificar si el usuario existe
-- Ejecutar esta query en el SQL Editor de Supabase

-- 1. Verificar si el usuario existe
SELECT 
    id,
    name,
    email,
    company_id,
    role_id
FROM users 
WHERE id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca';

-- 2. Si no hay resultados, verificar que la empresa existe
SELECT * FROM companies WHERE name = 'test_company';

-- 3. Si la empresa no existe, crearla
INSERT INTO companies (name) 
VALUES ('test_company') 
ON CONFLICT (name) DO NOTHING;

-- 4. Insertar el usuario si no existe
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

-- 5. Verificar que el usuario fue creado/actualizado
SELECT 
    u.id,
    u.name,
    u.email,
    u.company_id,
    u.role_id,
    c.name as company_name,
    r.name as role_name
FROM users u
LEFT JOIN companies c ON u.company_id = c.id
LEFT JOIN roles r ON u.role_id = r.id
WHERE u.id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca'; 