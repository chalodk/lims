# 02 — Sistema de Autenticacion

> **Estado**: TO-BE con divergencias. Ver `docs/AS-IS-estado-actual.md` para el estado real del código.
> Última actualización: 2026-05-19.

## Proposito

Este documento describe el sistema completo de autenticacion y autorizacion: como se registran los usuarios, como se validan las sesiones, el sistema de roles, y como se protegen las rutas.

## Stack de auth

- **Auth provider**: Supabase GoTrue (maneja usuarios, passwords, emails, JWT)
- **Server client**: `createClient()` → `@supabase/ssr` → cookie-based session
- **Browser client**: `getSupabaseClient()` → singleton con `persistSession: true`
- **API wrapper**: `withAuth()` → valida JWT en cada request

## Flujo de registro (signup)

```
POST /api/auth/signup (publico, sin auth)
  │
  ├─ 1. Valida name, email, password (min 8 chars)
  ├─ 2. Verifica si el email ya existe (listUsers via service_role)
  ├─ 3. Crea auth user via service_role (email_confirm: false)
  ├─ 4. Inserta perfil en tabla users via create_user_profile RPC (anon key)
  │     └─ SECURITY DEFINER bypasea RLS
  ├─ 5. Si falla el perfil → rollback (elimina auth user)
  └─ 6. Envia email de verificacion via auth.resend({ type: 'signup' })
       └─ Status: 201, mensaje: "Revisa tu correo..."
```

**Archivos clave**:
- `src/app/signup/page.tsx` — formulario de registro (usa Supabase Auth UI directamente)
- `scripts/signup-rpc-functions.sql` — `create_user_profile` RPC
- **NOTA**: `POST /api/auth/signup` esta documentado pero NO implementado aun.

**Restriccion de branding**: si el host es `nemachile`, el signup devuelve 403. Controlado en `src/lib/branding/hostBranding.ts`.

## Flujo de login

```
/auth/callback → Supabase intercambia code por session → cookies seteadas
  │
  ├─ Middleware: user autenticado + sin company_id → /setup-company
  ├─ Middleware: user autenticado + company_id + rol consumidor → /reports
  └─ Middleware: user autenticado + company_id + otro rol → /dashboard
```

**Archivos clave**:
- `src/app/login/page.tsx` — formulario de login (usa Supabase Auth UI)
- `src/app/auth/callback/route.ts` — callback de Supabase
- `src/middleware.ts` — redirects post-login

## Flujo de setup de empresa

```
POST /api/auth/setup-company (con withAuth)
  │
  ├─ 1. Valida company_name no vacio
  ├─ 2. Verifica que user no tenga ya company_id
  ├─ 3. Cuenta empresas del email (limite: MAX_COMPANIES_PER_EMAIL)
  └─ 4. Llama create_company_and_assign_admin RPC
       └─ Crea company + asigna role_id = 'admin' en users
```

**Archivos clave**:
- `src/app/setup-company/page.tsx` — UI post-registro
- `scripts/signup-rpc-functions.sql` — `create_company_and_assign_admin` RPC
- **NOTA**: `POST /api/auth/setup-company` esta documentado pero NO implementado aun.

## withAuth() — el wrapper universal

```ts
// src/lib/auth/api-auth.ts

export function withAuth(handler) {
  return async (request, ...args) => {
    try {
      const { user, supabase } = await authenticateApiRequest()
      // user: User de GoTrue (id, email, role, etc.)
      // supabase: server client con JWT del usuario
      return await handler(request, { user, supabase }, ...args)
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
      }
      // Error real → 500 con mensaje
      return NextResponse.json({ error: `Error interno: ${error.message}` }, { status: 500 })
    }
  }
}
```

**authenticateApiRequest() interna**:
1. `createClient()` → lee cookies del request → crea server client
2. `supabase.auth.getUser()` → valida JWT contra GoTrue
3. Si OK → `{ user, supabase }`. Si no → throw `AuthenticationError`

## Roles

| Rol | Vista por defecto | Permisos clave |
|---|---|---|
| `admin` | `/dashboard` | CRUD todo en su company, gestionar usuarios, crear reportes |
| `validador` | `/dashboard` | Validar resultados, crear reportes |
| `comun` | `/dashboard` | Ingresar resultados, ver datos |
| `consumidor` | `/reports` | Solo ver reportes asignados (portal cliente) |

Los roles se asignan via `users.role_id → roles.id`. El nombre del rol esta en `roles.name`.

## Middleware — proteccion de rutas

```ts
// src/middleware.ts

Rutas publicas (sin auth):   /login, /signup, /auth/callback
Rutas protegidas (auth):     todo lo demas
API routes:                  el middleware las intercepta y devuelve 401 si no hay sesion (withAuth se usaria para validacion adicional)
```

**Redirects automaticos**:
- Sin auth → `/login`
- Auth + sin company_id → `/setup-company`
- Auth + company_id + en `/setup-company` → `/dashboard`
- Auth + company_id + rol `consumidor` + en `/dashboard` → `/reports`
- Auth + en `/login` o `/signup` → `/dashboard` o `/reports` segun rol

## AuthContext — estado de sesion en el frontend

```ts
// src/contexts/AuthContext.tsx

Estado: { user, authUser, role, userRole, isLoading, isAuthenticated, session }
Metodos: signOut(), refreshSession(forceRefresh?)
```

**Cache**: los datos de usuario (`users` table + `roles`) se cachean por 5 minutos (`USER_DATA_CACHE_TTL = 300000`). `refreshSession(true)` bypasea el cache — crucial despues de `setup-company`.

**Token refresh**: chequeo cada 60 segundos. Si el token expira en < 5 minutos, se refresca proactivamente.

## Clientes Supabase — dos tipos

### Server client (`src/lib/supabase/server.ts`)
```ts
createClient() → createServerClient(url, anonKey, { cookies })
```
- Usado en: API routes (via withAuth), Server Components
- Session via cookies del request
- JWT del usuario en Authorization header → PostgREST aplica RLS

### Browser client (`src/lib/supabase/singleton.ts`)
```ts
getSupabaseClient() → createBrowserClient(url, anonKey, { auth: { persistSession: true } })
```
- Singleton (una instancia para toda la app)
- Usado SOLO en: AuthContext (auth listeners), SLA cards (realtime), login/signup
- NUNCA usar para escrituras a DB desde el navegador

## Reglas

1. **Toda escritura a DB va por API route con withAuth** — nunca desde el navegador
2. **No hardcodear tokens ni secrets** — todo en variables de entorno
3. **El service_role key jamas va al navegador** — solo en API routes
4. **Despues de cambiar company_id o role**, llamar `refreshSession(true)` para invalidar cache
5. **Mensajes de error de auth en español** para el usuario final
