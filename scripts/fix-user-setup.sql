-- Script corregido para crear/verificar el usuario
-- Ejecutar este script en el SQL Editor de Supabase

-- 1. Verificar si el usuario existe
SELECT 
    id,
    name,
    email,
    company_id,
    role_id
FROM users 
WHERE id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca';

-- 2. Verificar si la empresa existe
SELECT * FROM companies WHERE name = 'test_company';

-- 3. Crear la empresa si no existe (sin ON CONFLICT)
INSERT INTO companies (name) 
SELECT 'test_company'
WHERE NOT EXISTS (SELECT 1 FROM companies WHERE name = 'test_company');

-- 4. Insertar el usuario si no existe
INSERT INTO users (id, company_id, role_id, name, email) 
SELECT 
    '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca',
    (SELECT id FROM companies WHERE name = 'test_company'),
    1, -- role_id para admin
    'G. Arellano',
    'g.arellano@agroanalytics.cl'
WHERE NOT EXISTS (
    SELECT 1 FROM users WHERE id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca'
);

-- 5. Si el usuario ya existe, actualizarlo
UPDATE users 
SET 
    name = 'G. Arellano',
    email = 'g.arellano@agroanalytics.cl',
    company_id = (SELECT id FROM companies WHERE name = 'test_company'),
    role_id = 1
WHERE id = '4c1f4d54-5ea0-447c-a2c5-fb0570bb08ca';

-- 6. Verificar que el usuario fue creado/actualizado correctamente
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