# 06 — Sistema Multi-Tenant

> Última actualización: 2026-05-20.

## Proposito

Este documento describe como el LIMS aisla datos entre empresas (tenants), el sistema de branding por host, y las reglas para mantener la separacion.

## Documentos relacionados

| Doc | Relacion |
|---|---|
| `01-arquitectura.md` | Decision de diseno multi-tenant |
| `02-autenticacion.md` | Roles por empresa, company_id en usuarios |
| `03-api-routes.md` | Patrones de filtro A (directo) y B (inner join) |
| `04-base-de-datos.md` | Tablas con/sin company_id, RLS |

## Modelo de tenants

El LIMS usa un modelo **single-database, shared-tables** con `company_id` como discriminator:

```
PostgreSQL (una sola BD)
  └── public.companies:     { id: UUID, name: "AgroLab", created_at: ... }
                            { id: UUID, name: "BioChile", created_at: ... }

  └── public.samples:       { id: UUID, code: "S-001", company_id: "AgroLab" }
                            { id: UUID, code: "S-002", company_id: "BioChile" }

  └── public.results:       { id: UUID, ... sample_id → samples.company_id }
```

Cada usuario pertenece a una `company` via `users.company_id`. Un email puede tener multiples usuarios (uno por company), limitado por `MAX_COMPANIES_PER_EMAIL` (default: 1).

## Como se aplica el aislamiento

### Capa 1: Middleware (Next.js)

Asegura que usuarios sin `company_id` no puedan acceder a paginas protegidas. Redirige a `/setup-company`.

### Capa 2: API Routes (withAuth)

Cada endpoint obtiene el `company_id` del usuario autenticado y filtra todas las queries.

```ts
// Patron universal: siempre filtrar por company_id
const { data: userData } = await supabase
  .from('users')
  .select('company_id')
  .eq('id', user.id)
  .single()

const companyId = userData?.company_id

// Tabla con company_id directo
query = supabase.from('samples').select('*').eq('company_id', companyId)

// Tabla sin company_id (via FK)
query = supabase.from('results')
  .select('*, samples!inner(id)')
  .eq('samples.company_id', companyId)
```

### Capa 3: RLS (PostgreSQL)

Politicas de Row Level Security como ultima linea de defensa:

```sql
-- Si un bug en la API deja pasar una query sin company_id, RLS la bloquea
CREATE POLICY "company isolation" ON samples
  FOR SELECT USING (company_id = get_user_company_id());
```

## Tablas con y sin company_id

### Con company_id (la mayoria)

`samples`, `clients`, `projects`, `reports`, `users`, `action_logs`, `invitations`, `sample_files`, `sample_units`

Filtrado directo: `.eq('company_id', companyId)`

### Sin company_id (se unen via FK)

`results` → via `samples.sample_id`
`sample_tests` → via `samples.sample_id`
`unit_results` → via `sample_units.sample_id → samples.company_id` (no tiene company_id directo)

Filtrado via `!inner` join: `.select('*, samples!inner(id)').eq('samples.company_id', companyId)`

## Verificacion de propiedad en escrituras

Al crear/actualizar un recurso que referencia a otro, siempre verificar que el recurso referenciado pertenece a la misma company:

```ts
// POST /api/results — verificar que la muestra es de la company del usuario
const { data: sampleData } = await supabase
  .from('samples')
  .select('company_id')
  .eq('id', sample_id)
  .single()

if (sampleData.company_id !== userCompanyId) {
  return NextResponse.json({ error: 'Acceso no autorizado' }, { status: 403 })
}
```

## Branding multi-tenant

El LIMS sirve dos marcas basado en el host header:

| Host | Branding | Signup |
|---|---|---|
| `app.nemachile.cl` | `nemachile` (logo, colores) | Bloqueado (403) |
| `lims.agroanalytics.cl` | `generic` (LIMS generico) | Abierto |

**Implementacion**: `src/lib/branding/hostBranding.ts`

```ts
resolveAppBrandingFromRequestHeaders(host, xForwardedHost) → 'nemachile' | 'generic'
```

Los hosts se configuran via:
- `NEXT_PUBLIC_NEMACHILE_HOSTS` (default: `app.nemachile.cl`)
- `NEXT_PUBLIC_SAAS_HOSTS` (default: `lims.agroanalytics.cl`)
- `NEXT_PUBLIC_BRANDING_FALLBACK` (default: `nemachile`)

## Aislamiento en componentes frontend

Los componentes NO filtran por `company_id` — eso es responsabilidad del backend. El frontend simplemente llama a los endpoints API y recibe datos ya filtrados.

## Que pasa si un usuario cambia de company

Actualmente, `MAX_COMPANIES_PER_EMAIL` limita a 1 empresa por email. Si en el futuro se permite multiples empresas, se necesitaria:
1. Un selector de empresa activa en la UI
2. Un endpoint para cambiar `current_company_id` en la sesion
3. Middleware que use la empresa activa

## Reglas

1. **Toda query a tabla de negocio debe filtrar por company_id** (directo o via FK join)
2. **Verificar propiedad al escribir**: si un recurso A referencia a B, B debe ser de la misma company
3. **No exponer datos de otras companies en mensajes de error** (ej: "Muestra no encontrada", no "Muestra pertenece a otra empresa")
4. **El branding nunca debe filtrar datos** — solo afecta UI (logo, colores) y disponibilidad de signup
5. **Probar con dos companies diferentes** al hacer cambios en queries multi-tenant
