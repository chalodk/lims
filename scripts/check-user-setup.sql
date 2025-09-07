-- Script para verificar y crear usuario en la tabla users si no existe
-- Este script debe ejecutarse después de que un usuario se registre en auth.users

-- Verificar si el usuario existe en la tabla users
SELECT 
  u.id,
  u.email,
  u.name,
  u.role_id,
  r.name as role_name
FROM auth.users au
LEFT JOIN public.users u ON au.id = u.id
LEFT JOIN public.roles r ON u.role_id = r.id
WHERE au.email = 'tu-email@ejemplo.com'; -- Reemplazar con el email del usuario

-- Si el usuario no existe en la tabla users, crearlo:
-- INSERT INTO public.users (id, email, name, role_id, company_id)
-- SELECT 
--   au.id,
--   au.email,
--   COALESCE(au.raw_user_meta_data->>'name', au.email),
--   1, -- role_id para admin (ajustar según necesidad)
--   NULL -- company_id (ajustar según necesidad)
-- FROM auth.users au
-- WHERE au.email = 'tu-email@ejemplo.com'
-- AND NOT EXISTS (
--   SELECT 1 FROM public.users u WHERE u.id = au.id
-- );

-- Verificar roles disponibles
SELECT id, name, level, description FROM public.roles ORDER BY level;
