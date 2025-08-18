# Guía de Configuración de Supabase

## Paso 1: Crear Proyecto en Supabase

1. Ve a [https://supabase.com](https://supabase.com)
2. Crea una cuenta o inicia sesión
3. Haz clic en "New Project"
4. Completa la información del proyecto:
   - **Name**: LIMS-Lab
   - **Database Password**: (elige una contraseña segura)
   - **Region**: (elige la más cercana)
5. Haz clic en "Create new project"

## Paso 2: Obtener Credenciales

1. Una vez creado el proyecto, ve a **Settings** → **API**
2. Copia los siguientes valores:
   - **Project URL** (ej: `https://xyz.supabase.co`)
   - **anon public** key (ej: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...`)

## Paso 3: Configurar Base de Datos

1. Ve a **SQL Editor** en el panel de Supabase
2. Copia y pega el contenido del archivo `er_schema_complete.sql`
3. Haz clic en "Run" para ejecutar el script

## Paso 4: Configurar Variables de Entorno

1. En tu proyecto local, edita el archivo `.env.local`:
   ```env
   NEXT_PUBLIC_SUPABASE_URL=https://tu-proyecto.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key_aqui
   ```

2. Reemplaza los valores con las credenciales reales de tu proyecto

## Paso 5: Configurar Autenticación

1. Ve a **Authentication** → **Settings**
2. En **Site URL**, agrega: `http://localhost:3000`
3. En **Redirect URLs**, agrega: `http://localhost:3000/dashboard`

## Paso 6: Crear Usuario de Prueba

1. Ve a **Authentication** → **Users**
2. Haz clic en "Add user"
3. Completa la información:
   - **Email**: admin@lims.com
   - **Password**: (elige una contraseña)
4. Haz clic en "Create user"

## Paso 7: Insertar Datos de Prueba

Ejecuta este SQL en el SQL Editor para crear datos de prueba:

```sql
-- Insertar empresa de prueba
INSERT INTO companies (name) VALUES ('Laboratorio de Prueba');

-- Insertar roles (ya están insertados por el script principal)
-- Los roles ya están creados: admin, validador, comun, consumidor

-- Insertar usuario de prueba (reemplaza 'user_id' con el UUID del usuario creado)
INSERT INTO users (id, company_id, role_id, name, email) 
VALUES (
  'user_id_aqui', -- Reemplaza con el UUID del usuario de Supabase Auth
  (SELECT id FROM companies WHERE name = 'Laboratorio de Prueba'),
  1, -- role_id para admin
  'Administrador',
  'admin@lims.com'
);
```

## Paso 8: Verificar Configuración

1. Ejecuta `npm run dev`
2. Ve a `http://localhost:3000`
3. Deberías ver la página de login
4. Inicia sesión con las credenciales creadas

## Solución de Problemas

### Error "Failed to fetch"
- Verifica que las credenciales en `.env.local` sean correctas
- Asegúrate de que el proyecto de Supabase esté activo

### Error de autenticación
- Verifica que el usuario exista en Supabase Auth
- Asegúrate de que el usuario esté en la tabla `users`

### Error de base de datos
- Verifica que el script SQL se haya ejecutado correctamente
- Revisa los logs en Supabase para errores

## Próximos Pasos

Una vez configurado:
1. Crear más usuarios de prueba
2. Configurar RLS (Row Level Security)
3. Implementar las páginas específicas del LIMS
4. Configurar automatizaciones con n8n 