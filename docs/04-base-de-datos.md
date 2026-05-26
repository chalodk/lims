# 04 — Base de Datos

> Última actualización: 2026-05-20.

## Proposito

Este documento describe el esquema de la base de datos, las tablas principales, las relaciones, las politicas RLS, y las funciones SECURITY DEFINER.

## Documentos relacionados

| Doc | Relacion |
|---|---|
| `03-api-routes.md` | Como se consulta la DB desde los endpoints |
| `06-multi-tenant.md` | Modelo de company_id, tablas con/sin tenant |
| `07-reportes-pdf.md` | Tablas relacionadas con reportes |

## Stack de datos

- **Motor**: PostgreSQL 15 (via Supabase)
- **API de consulta**: PostgREST (REST sobre PostgreSQL)
- **Auth**: GoTrue (usuarios en `auth.users`, perfil en `public.users`)
- **RLS**: Row Level Security scripteado pero NO desplegado en produccion aun (ver `scripts/enable-rls-complete.sql` y `docs/AS-IS-estado-actual.md`)
- **Funciones**: SECURITY DEFINER para operaciones privilegiadas

## Tablas principales (35 tablas en `public`)

### Core del negocio

| Tabla | Proposito | FK clave |
|---|---|---|
| `companies` | Empresas (tenants) | — |
| `users` | Perfiles de usuario (extiende `auth.users`) | `company_id`, `role_id` |
| `roles` | Roles del sistema (`admin`, `csx`, `validador`, `comun`, `consumidor`) | — |
| `clients` | Clientes (agricultores, empresas, etc.) | `company_id` |
| `projects` | Proyectos | `company_id`, `client_id` |
| `samples` | Muestras recibidas | `company_id`, `client_id`, `project_id` |
| `sample_tests` | Tests asignados a cada muestra | `sample_id`, `test_catalog_id`, `method_id` |
| `results` | Resultados de analisis | `sample_id`, `sample_test_id`, `performed_by`, `validated_by` |
| `reports` | Reportes generados | `company_id`, `sample_id`, `client_id` |

### Catalogos

| Tabla | Proposito |
|---|---|
| `analysis_types` | Tipos de analisis para informes (virologia, nematologia...) — fuente de verdad compartida con `src/config/analysisTypes.ts` |
| `company_analysis_type_templates` | Templates PDFMonkey por company (sobreescribe el global) |
| `test_catalog` | Tipos de analisis (PCR, ELISA, microscopia...) |
| `methods` | Metodos de laboratorio |
| `analytes` | Patogenos, virus, nematodos detectables |
| `species` | Especies vegetales |
| `varieties` | Variedades por especie |
| `tissues` | Tejidos vegetales |
| `test_method_map` | Relacion test ↔ metodo |
| `units_profiles` | Perfiles de unidades de medida |
| `units_profile_fields` | Campos de cada perfil de unidad |

### Sistema

| Tabla | Proposito |
|---|---|
| `action_logs` | Auditoria de acciones |
| `invitations` | Invitaciones a colaboradores/clientes |
| `notifications` | Cola de notificaciones |
| `interpretation_rules` | Reglas de interpretacion automatica |
| `applied_interpretations` | Resultados de interpretaciones aplicadas |
| `sla_policies` | Politicas de SLA |
| `report_templates` | Templates de reportes |
| `report_assets` | Assets de reportes (imagenes, tablas) |
| `sample_files` | Archivos adjuntos a muestras |
| `sample_units` | Unidades de medida por muestra |
| `unit_results` | Resultados numericos por unidad |
| `sample_audit_logs` | Auditoria de cambios en muestras |
| `sample_status_transitions` | Historial de cambios de estado |
| `role_views` | Vistas asignadas a roles |
| `views` | Vistas del sistema |
| `permissions` | Permisos del sistema |

## Relaciones clave

```
companies ──┬── users ──────────────── role_id → roles
            ├── clients ────── client_id ─┐
            ├── projects ──── project_id ─┤
            ├── samples ────── sample_id ─┼── results ── performed_by → users
            │        │              │             └── validated_by → users
            │        │              ├── sample_tests ── test_catalog_id → test_catalog
            │        │              │               └── method_id → methods
            │        │              ├── sample_units → unit_results
            │        │              └── sample_files
            ├── reports ─────────────────────────────┘
            └── action_logs
```

## RLS (Row Level Security)

**Estado actual**: RLS NO esta habilitado en produccion. Los scripts estan listos en `scripts/` (`enable-rls-complete.sql`, `rls-policies.sql`) pero aun no se ejecutaron. La unica capa de aislamiento multi-tenant es el filtro manual `company_id` en las rutas API.

Las politicas RLS usaran estas funciones helper (definidas en los scripts):

- `get_user_company_id()` → devuelve el `company_id` del usuario autenticado
- `is_admin()` → verifica si el usuario tiene rol admin

### Ejemplos de politicas (planificadas)

```sql
-- samples: usuarios ven solo las muestras de su company
CREATE POLICY "Users can view samples from their company" ON samples
  FOR SELECT USING (company_id = get_user_company_id());

-- results: acceso via la muestra asociada (results no tiene company_id)
-- Esto se maneja en la capa API con PostgREST !inner join, no via RLS directa
```

## Funciones SECURITY DEFINER

Estas funciones se ejecutan con los privilegios del owner (bypasean RLS). Son necesarias para operaciones donde el usuario aun no tiene `company_id` asignado.

```sql
-- Ejecutar en Supabase SQL Editor
-- Archivo: scripts/signup-rpc-functions.sql

-- Crea perfil inicial (sin company ni rol)
CREATE OR REPLACE FUNCTION create_user_profile(
  p_user_id UUID, p_name TEXT, p_email TEXT
) RETURNS JSONB ... SECURITY DEFINER;

-- Crea empresa y asigna admin
CREATE OR REPLACE FUNCTION create_company_and_assign_admin(
  p_user_id UUID, p_company_name TEXT
) RETURNS JSONB ... SECURITY DEFINER;

-- Permisos
GRANT EXECUTE ON FUNCTION create_user_profile TO anon, authenticated;
GRANT EXECUTE ON FUNCTION create_company_and_assign_admin TO authenticated;
```

**Cuando modificar estas funciones**: solo si cambia el flujo de registro o la estructura de `users`/`companies`. Siempre probar en desarrollo primero.

## PostgREST — sintaxis de consulta

El cliente de Supabase (`@supabase/supabase-js`) traduce a PostgREST. Conocer la sintaxis ayuda a escribir queries eficientes.

### Embedding (joins)

```ts
// LEFT JOIN (default)
.select('*, clients(name, email)')

// INNER JOIN (solo rows con match)
.select('*, samples!inner(id, code)')
```

### Filtros sobre tablas embebidas

```ts
// Filtrar results cuyas samples tengan cierto company_id
.eq('samples.company_id', companyId)
```

### Conteo exacto

```ts
.select('*', { count: 'exact' })
// Devuelve { data, error, count }
```

### Rangos (paginacion)

```ts
.range(from, to)  // from=0, to=19 para pagina 1 con limit 20
```

## Migraciones

No hay sistema de migraciones automatizado (no Prisma, no Drizzle). Los cambios de esquema se hacen manualmente en el SQL Editor de Supabase.

**Regla**: documentar todo cambio de esquema en `scripts/` con un archivo `.sql` descriptivo.

## Indices recomendados

Para queries frecuentes, asegurar indices en:
- `company_id` en todas las tablas que lo tienen
- `sample_id` en `results`, `sample_tests`, `sample_units`
- `status` en `samples`, `results`, `reports`
- `created_at` en tablas con ordenamiento
- `email` en `users` (para busqueda de duplicados)

## Reglas

1. **Nunca ejecutar DELETE sin WHERE** — y el WHERE debe incluir `company_id`
2. **Nunca exponer el schema en errores al cliente** en produccion
3. **Probar RPC functions en Supabase SQL Editor antes de usarlas en codigo**
4. **Todo cambio de schema se documenta en `scripts/`**
5. **No crear triggers sin documentar su proposito y efectos secundarios**
