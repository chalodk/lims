-- 005: Agrega el rol "csx" (Customer Success).
-- csx es un rol cross-company para el equipo interno del laboratorio.
-- Gestiona catalogos globales (analysis_types, futuros catalogos).
-- No tiene acceso a configuracion por company (gestion de usuarios, templates).

ALTER TABLE public.roles DROP CONSTRAINT IF EXISTS roles_name_check;

ALTER TABLE public.roles ADD CONSTRAINT roles_name_check
  CHECK (name = ANY (ARRAY['admin','validador','comun','consumidor','csx']::text[]));

INSERT INTO public.roles (id, name, level, description)
VALUES (5, 'csx', 90, 'Customer Success - gestiona catalogos globales del sistema')
ON CONFLICT (id) DO NOTHING;
