# AS-IS — Estado Actual del Código

> Generado desde el código en `src/`, no desde la documentación existente.
> Fecha: 2026-05-19.

## 1. API Routes: Inventario Real

El proyecto tiene **35 archivos `route.ts`** en 13 directorios bajo `src/app/api/`.

### 1.1 Estado de autenticación

- **33/35 rutas** verifican autenticación manualmente (inline `createClient()` + `getUser()`)
- **0/35 rutas** usan el wrapper `withAuth()` (existe en `src/lib/auth/api-auth.ts` pero no se importa en ninguna ruta)
- **2 rutas sin user auth** (legítimo):
  - `api/cron/sla-update/` — usa `CRON_SECRET` via header Bearer
  - `api/auth/accept-invite/` — endpoint público basado en token de invitación

### 1.2 Estado de filtro multi-tenant (company_id)

- **16/35 rutas** tienen filtro `company_id` en al menos una operación
- **19/35 rutas** no mencionan `company_id` en ningún punto

De las 19 sin filtro, se dividen en:

**Rutas legítimamente sin company_id** (datos globales o auth):
- `api/auth/user/` — perfil del usuario autenticado
- `api/settings/roles/` — roles son globales del sistema
- `api/interpretations/rules/` — reglas de interpretación globales
- `api/reports/templates/` — plantillas de reportes globales
- `api/cron/sla-update/` — cron job que opera sobre todas las companies
- `api/reports/pdf/[filename]/` — sirve PDFs por filename público
- `api/settings/users/[id]/role/` — admin, cambia rol (dato global)
- `api/settings/users/[id]/clients/` — admin, asigna clientes a usuario
- `api/settings/users/[id]/clients/[clientId]/` — admin, desasigna
- `api/settings/users/[id]/route.ts` — admin, gestiona usuarios

**Rutas que DEBERÍAN tener company_id y no lo tienen** (datos de negocio):
| Ruta | Métodos | Riesgo |
|---|---|---|
| `api/samples/[id]/tests/` | GET, POST | Lee/crea tests de cualquier muestra sin verificar propiedad |
| `api/samples/[id]/tests/[sample_test_id]/` | DELETE | Elimina test sin verificar propiedad de la muestra padre |
| `api/samples/[id]/units/` | GET, POST | Lee/crea unidades de cualquier muestra |
| `api/units/[id]/results/` | GET, POST | Lee/crea resultados de unidad sin verificar cadena de propiedad |
| `api/reports/delete/[id]/` | DELETE | Elimina cualquier reporte sin verificar company_id |
| `api/reports/[sampleId]/render/` | POST | Renderiza reporte sin verificar propiedad de la muestra |
| `api/reports/pdfmonkey/` | POST | Genera PDF sin verificar propiedad de results/samples |
| `api/interpretations/evaluate/` | POST | Evalúa reglas sobre muestra sin verificar propiedad |
| `api/sla/update/` | GET, POST | GET sin autenticación — expone datos SLA de todas las companies |

### 1.3 Endpoints documentados pero no implementados

Estos aparecen en `docs/03-api-routes.md` pero no existen en el código:

- `POST /api/auth/signup` — el registro se hace vía Supabase Auth UI en el frontend
- `POST /api/auth/setup-company` — no existe ruta
- `POST /api/auth/setup` — no existe ruta
- `GET /api/reports` — no existe `reports/route.ts` (solo hay subdirectorios)
- `POST /api/reports` — no existe
- `GET /api/clients` — `clients/route.ts` solo tiene POST
- `PUT /api/clients/[id]` — no existe `clients/[id]/`
- `DELETE /api/clients/[id]` — no existe
- `GET /api/projects` — no existe directorio `projects/`
- `POST /api/projects` — no existe
- `GET /api/tests` — no existe directorio `tests/`
- `GET /api/methods` — no existe directorio `methods/`
- `GET /api/analytes` — no existe directorio `analytes/`

### 1.4 Anti-patrón `.in()` en results/route.ts

`api/results/route.ts` (GET, líneas 76-96) usa el patrón prohibido por la propia documentación:
1. Obtiene todos los `sample_id` de la company: `supabase.from('samples').select('id').eq('company_id', companyId)`
2. Filtra results con `.in('sample_id', sampleIds)`

Con suficientes muestras, esto genera URLs que exceden el límite de PostgREST/undici y causa errores 431 o timeouts. La documentación (`docs/03-api-routes.md`) recomienda usar `!inner` join, pero no se aplicó aquí.

### 1.5 Errores de Supabase expuestos al cliente

20+ rutas devuelven `error.message` directamente al cliente, sin sanitizar. La regla #6 de `docs/03-api-routes.md` lo desaconseja en producción, pero no hay diferenciación de entorno implementada.

---

## 2. Frontend: Accesos Directos a Base de Datos

La regla documentada (`docs/05-frontend.md`) dice que solo AuthContext, SLACards, login y test-db pueden usar el Supabase browser client. Todo lo demás debe usar `fetch('/api/...')`.

### 2.1 Archivos que violan la regla

| Archivo | Llamadas directas | Tipo |
|---|---|---|
| `src/components/samples/EnhancedSampleForm.tsx` | `supabase.from('clients').select()`, `supabase.from('projects').select()`, `supabase.from('test_catalog').select()`, `supabase.from('methods').select()` | 4 SELECTs para datos de catálogo |
| `src/components/auth/UserSetup.tsx` | `supabase.from('roles').select()`, `supabase.from('users').insert()`, `supabase.rpc('log_action')` | SELECT + INSERT + RPC |
| `src/app/estadisticas/page.tsx` | `supabase.from('samples').select('id', {count})`, `supabase.from('results').select('id', {count})`, `supabase.from('clients').select('id', {count})` | 3 SELECTs para conteos (redundantes con `/api/dashboard/stats`) |

### 2.2 Archivos que SÍ cumplen la regla

Todas las demás páginas y componentes usan `fetch('/api/...')` correctamente: `samples/page.tsx`, `results/page.tsx`, `reports/page.tsx`, `clients/page.tsx`, `dashboard/page.tsx`, `settings/page.tsx`, y todos los modales en `components/samples/`, `components/results/`, `components/reports/`, `components/clients/`, `components/settings/`.

---

## 3. Base de Datos: RLS

### 3.1 Estado real

- **RLS NO está habilitado en producción**.
- Existen 6 scripts RLS en `scripts/`: `enable-rls-complete.sql`, `setup-rls-policies.sql`, `rls-policies.sql`, `rls-simple.sql`, `disable-rls.sql`, `fix-clients-delete-rls.sql`, `verify-rls-readiness.sql`, `verify-rls-impact.sql`
- Las funciones helper (`get_user_company_id()`, `get_user_role()`, `is_admin()`) están definidas en los scripts SQL pero no se sabe si se ejecutaron en la BD de producción.
- La única capa de aislamiento multi-tenant real es el filtro manual `company_id` en 16/35 rutas API.

### 3.2 Triggers activos

6 triggers documentados en `RLS_INVENTORY.md` para: `updated_at` en samples/reports/results/users, `test_area` en results, y `test_areas` sync en reports.

---

## 4. Middleware

`src/middleware.ts` implementa:
- Rutas públicas: `/login`, `/signup` (sin auth)
- Rutas API públicas: `/api/auth/callback` (sin auth)
- **API routes sí son interceptadas** por el middleware — si no hay usuario, devuelve 401
- Páginas protegidas sin auth redirigen a `/login`
- Usuarios sin `company_id` redirigen a `/setup-company`

Esto contradice `docs/02-autenticacion.md` que dice "API routes: el middleware las deja pasar".

---

## 5. Discrepancias docs vs código

| Documento | Qué dice | Realidad |
|---|---|---|
| `01-arquitectura.md` | 45 endpoints | 35 archivos route.ts |
| `01-arquitectura.md` | `withAuth()` como capa de auth | 0 rutas lo usan |
| `01-arquitectura.md` | `src/lib/reports/` con builders | No existe directorio `builders/`; lógica en `pdfmonkey/route.ts` (1400 líneas) |
| `02-autenticacion.md` | `POST /api/auth/signup` documentado | No existe la ruta |
| `02-autenticacion.md` | `POST /api/auth/setup-company` documentado | No existe la ruta |
| `02-autenticacion.md` | API routes bypass middleware | El middleware SÍ autentica API routes |
| `03-api-routes.md` | Catálogo de 45 endpoints | 35 implementados, 13 ausentes |
| `04-base-de-datos.md` | "RLS habilitado en tablas principales" | RLS no está activo en producción |
| `05-frontend.md` | "Toda escritura a DB va por API route" | EnhancedSampleForm y UserSetup escriben directo |
| `06-multi-tenant.md` | RLS como "capa 3" de defensa | No desplegado |
| `06-multi-tenant.md` | `unit_results` en ambas listas (con y sin company_id) | Contradice al DDL real |
| `07-reportes-pdf.md` | Builders en archivos separados | Lógica monolítica en `pdfmonkey/route.ts` |
| `08-deploy-entorno.md` | Health check: `GET /api/auth/signup` | Esa ruta no existe |

---

## 6. Servicios externos (verificados)

| Servicio | Estado |
|---|---|
| Supabase | PostgreSQL + Auth + Storage — operativo |
| PDFMonkey | 6 templates configurados — operativo |
| n8n Webhook | Notificación de credenciales — configurado en `userCredentialsWebhook.ts` |
| Railway | Plataforma de deploy — operativo |
| Cron SLA | `POST /api/cron/sla-update` con `CRON_SECRET` — operativo |
