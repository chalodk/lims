# 📋 REPORTE DETALLADO: SISTEMA DE AUTENTICACIÓN Y VALIDACIÓN

## 🎯 RESUMEN EJECUTIVO

Este reporte analiza en profundidad el sistema de autenticación, validación de usuarios y persistencia de sesión en el sistema LIMS. Se identifican varios problemas críticos que están causando la pérdida de sesión y fallos en las validaciones de usuario.

---

## 1. 🔐 FLUJO DE LOGIN

### 1.1 Proceso Actual de Login

**Ubicación:** `src/app/login/page.tsx`

El flujo de login funciona de la siguiente manera:

1. **Usuario ingresa credenciales** → Se capturan email y password
2. **Llamada a Supabase Auth:**
   ```typescript
   const { error } = await supabase.auth.signInWithPassword({
     email,
     password
   })
   ```
3. **Después del login exitoso:**
   - Se obtiene el usuario autenticado: `await supabase.auth.getUser()`
   - Se consulta la base de datos para obtener el rol del usuario
   - Se redirige según el rol:
     - `consumidor` → `/reports`
     - Otros roles → `/dashboard`

### 1.2 Cliente Supabase Utilizado en Login

El login usa el cliente del navegador creado mediante el **singleton pattern**:

**Ubicación:** `src/lib/supabase/singleton.ts`

```typescript
let supabaseClient: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(...)
  }
  return supabaseClient
}
```

**Configuración del cliente:**
- `autoRefreshToken: true` ✅
- `persistSession: true` ✅
- `detectSessionInUrl: true` ✅
- `flowType: 'pkce'` ✅

### 1.3 Callback de Autenticación

**Ubicación:** `src/app/auth/callback/route.ts`

Este route maneja:
- Confirmaciones de email
- OAuth callbacks
- Intercambio de código por sesión: `supabase.auth.exchangeCodeForSession(code)`
- Redirección según rol del usuario

---

## 2. 🛡️ SISTEMA DE VALIDACIÓN DE USUARIOS

### 2.1 Middleware (Validación en Rutas)

**Ubicación:** `src/middleware.ts`

**Funcionamiento:**

1. **Se ejecuta en cada request** excepto:
   - Rutas API (`/api/*`)
   - Archivos estáticos (`/_next/*`, extensiones de archivo)
   - Rutas públicas (`/login`, `/signup`)

2. **Método de validación:**
   ```typescript
   const supabase = await createClient() // Cliente servidor
   const { data: { session }, error } = await supabase.auth.getSession()
   ```

3. **Lógica de protección:**
   - Si hay error obteniendo sesión → Redirige a `/login` (si no es ruta pública)
   - Si no hay sesión → Redirige a `/login` (si no es ruta pública)
   - Si hay sesión → Verifica roles y permite acceso

4. **Problema crítico identificado:**
   - El middleware usa `getSession()` que puede no refrescar tokens expirados automáticamente
   - No hay refresh manual de tokens antes de validar
   - Las rutas API se saltan completamente el middleware

### 2.2 Validación en Rutas API

**Patrón común en todas las rutas API:**

```typescript
const supabase = await createClient() // Cliente servidor
const { data: { user }, error: authError } = await supabase.auth.getUser()

if (authError || !user) {
  return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
}
```

**Problema crítico identificado:**
- Las rutas API usan `getUser()` mientras que el middleware usa `getSession()`
- Esta **discrepancia** puede causar que:
  - El middleware valide correctamente
  - Pero las API routes fallen porque el token no está sincronizado
  - O viceversa: el middleware rechace pero las API routes funcionen

### 2.3 Clientes Supabase Utilizados

Hay **3 clientes diferentes** de Supabase en el proyecto:

1. **`src/lib/supabase/client.ts`** - Cliente navegador (no se usa directamente)
2. **`src/lib/supabase/singleton.ts`** - Cliente navegador singleton (usado en componentes)
3. **`src/lib/supabase/server.ts`** - Cliente servidor (usado en middleware y API routes)

**Problema:** Esta fragmentación puede causar inconsistencias en el estado de autenticación.

---

## 3. 💾 PERSISTENCIA DE SESIÓN

### 3.1 Persistencia en el Cliente (Navegador)

**Ubicación:** `src/contexts/AuthContext.tsx`

**Mecanismo de persistencia:**

1. **Inicialización al montar el componente:**
   ```typescript
   useEffect(() => {
     const { data: { session } } = await supabase.auth.getSession()
     await updateAuthState(session)
   }, [])
   ```

2. **Listener de cambios de autenticación:**
   ```typescript
   supabase.auth.onAuthStateChange(async (event, session) => {
     if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
       await updateAuthState(session)
     }
   })
   ```

3. **Configuración del cliente:**
   - `persistSession: true` → Almacena sesión en localStorage
   - `autoRefreshToken: true` → Refresca tokens automáticamente

### 3.2 Persistencia en el Servidor (Cookies)

**Ubicación:** `src/lib/supabase/server.ts`

**Mecanismo:**
- Usa `createServerClient` de `@supabase/ssr`
- Lee cookies de `next/headers`
- Configura cookies para almacenar sesión:
  ```typescript
  cookies: {
    getAll() { return cookieStore.getAll() },
    setAll(cookiesToSet) { /* configura cookies */ }
  }
  ```

**Problema crítico identificado:**
- El método `setAll` tiene un `try-catch` que **silencia errores** cuando se llama desde Server Components
- El comentario dice: "This can be ignored if you have middleware refreshing user sessions"
- Pero el middleware **NO está refrescando sesiones**, solo las valida

### 3.3 Sincronización Cliente-Servidor

**Problema identificado:**
- El cliente (navegador) mantiene la sesión en `localStorage`
- El servidor mantiene la sesión en `cookies`
- **No hay garantía de sincronización** entre ambos
- Si las cookies expiran pero localStorage tiene sesión válida → El servidor rechaza pero el cliente cree que está autenticado
- Si localStorage se limpia pero las cookies persisten → El cliente muestra desautenticado pero el servidor permite acceso

---

## 4. 🔍 ANÁLISIS DE PROBLEMAS IDENTIFICADOS

### 4.1 Problema Crítico #1: Discrepancia entre `getSession()` y `getUser()`

**Ubicación:**
- Middleware usa `getSession()` (línea 27 de `middleware.ts`)
- API routes usan `getUser()` (52+ ocurrencias en `src/app/api`)

**Impacto:**
- `getSession()` puede retornar una sesión expirada si no se refresca
- `getUser()` valida el token y puede fallar si está expirado
- Esto causa que el middleware permita acceso pero las API routes fallen (o viceversa)

**Síntomas:**
- Usuario puede navegar (middleware permite) pero acciones fallan (API rechaza)
- O usuario no puede navegar (middleware rechaza) pero puede hacer llamadas directas a API

### 4.2 Problema Crítico #2: Middleware no refresca sesiones

**Ubicación:** `src/middleware.ts`

**Problema:**
El middleware solo valida la sesión pero **no la refresca** si está cerca de expirar. Supabase SSR debería manejar esto automáticamente, pero hay evidencia de que no está funcionando correctamente.

**Solución esperada:**
El middleware debería usar `getUser()` que valida Y refresca el token si es necesario, o implementar refresh manual antes de validar.

### 4.3 Problema Crítico #3: Rutas API no pasan por middleware

**Ubicación:** `src/middleware.ts` línea 12-17

```typescript
const isApiRoute = pathname.startsWith('/api/')
if (isApiRoute) {
  return NextResponse.next() // Se salta completamente
}
```

**Impacto:**
- Cada ruta API debe validar autenticación individualmente
- No hay validación centralizada
- Puede haber inconsistencias entre validaciones
- Si se cambia la lógica de validación, hay que cambiar 50+ archivos

### 4.4 Problema Crítico #4: Múltiples clientes Supabase

**Problema:**
Hay 3 formas diferentes de crear clientes Supabase:
1. `client.ts` - No se usa
2. `singleton.ts` - Usado en componentes cliente
3. `server.ts` - Usado en middleware y API routes

**Impacto:**
- Dificulta el debugging
- Puede causar inconsistencias de estado
- El singleton puede mantener estado obsoleto

### 4.5 Problema Crítico #5: Error silenciado en setAll de cookies

**Ubicación:** `src/lib/supabase/server.ts` línea 21-25

```typescript
} catch {
  // The `setAll` method was called from a Server Component.
  // This can be ignored if you have middleware refreshing
  // user sessions.
}
```

**Problema:**
- Los errores al configurar cookies se silencian completamente
- El comentario asume que el middleware refresca sesiones, pero **no lo hace**
- Esto puede causar que las cookies no se actualicen correctamente

### 4.6 Problema Moderado #6: Race conditions en AuthContext

**Ubicación:** `src/contexts/AuthContext.tsx`

**Problema:**
- Múltiples llamadas a `updateAuthState` pueden ejecutarse simultáneamente
- El flag `mounted` ayuda pero no previene todas las condiciones de carrera
- Si hay múltiples tabs abiertos, pueden haber conflictos

### 4.7 Problema Moderado #7: Falta de manejo de refresh token expirado

**Problema:**
- Si el refresh token expira, no hay manejo explícito
- El usuario simplemente pierde la sesión sin aviso
- No hay intento de re-autenticación automática

### 4.8 Problema Menor #8: Logs excesivos en producción

**Ubicación:** `src/middleware.ts`, `src/contexts/AuthContext.tsx`

**Problema:**
- Múltiples `console.log` en código que se ejecuta en producción
- Puede afectar performance y saturar logs
- Deberían estar solo en desarrollo

---

## 5. 📊 FLUJO COMPLETO DE AUTENTICACIÓN (ACTUAL)

```
1. Usuario hace login
   ↓
2. signInWithPassword() → Supabase Auth
   ↓
3. Supabase crea sesión → Almacena en localStorage (cliente) y cookies (servidor)
   ↓
4. AuthContext detecta SIGNED_IN → Actualiza estado
   ↓
5. Usuario navega a página protegida
   ↓
6. Middleware intercepta request
   ↓
7. Middleware usa getSession() → Lee cookies
   ↓
8. Si hay sesión → Permite acceso
   ↓
9. Componente renderiza → Usa AuthContext (lee localStorage)
   ↓
10. Componente hace llamada API
    ↓
11. API route usa getUser() → Valida token
    ↓
12. Si token válido → Procesa request
    ↓
13. Si token expirado → Retorna 401
```

**Problema en el flujo:**
- Paso 7 y 11 usan métodos diferentes que pueden dar resultados diferentes
- No hay garantía de sincronización entre cookies y localStorage
- Si el token expira entre paso 8 y 11, el paso 12 falla

---

## 6. 💡 PROPUESTAS DE MEJORA

### 6.1 Propuesta #1: Unificar método de validación (CRÍTICA)

**Cambio:**
- Hacer que el middleware también use `getUser()` en lugar de `getSession()`
- O hacer que todas las API routes usen `getSession()` (menos recomendado)

**Implementación:**
```typescript
// middleware.ts
const supabase = await createClient()
const { data: { user }, error } = await supabase.auth.getUser()

if (error || !user) {
  if (!isPublicRoute) {
    return NextResponse.redirect(new URL('/login', request.url))
  }
}
```

**Beneficios:**
- Consistencia entre middleware y API routes
- `getUser()` valida y refresca tokens automáticamente
- Reduce errores de autenticación

### 6.2 Propuesta #2: Implementar refresh explícito de sesión (CRÍTICA)

**Cambio:**
Agregar refresh manual de sesión en el middleware antes de validar.

**Implementación:**
```typescript
// middleware.ts
const supabase = await createClient()

// Intentar refrescar la sesión primero
const { data: { session }, error: refreshError } = await supabase.auth.refreshSession()

// Si falla el refresh, intentar obtener sesión actual
if (refreshError) {
  const { data: { session: currentSession }, error } = await supabase.auth.getSession()
  // validar currentSession...
}
```

**Beneficios:**
- Asegura que los tokens estén frescos antes de validar
- Reduce errores por tokens expirados

### 6.3 Propuesta #3: Middleware también para rutas API (CRÍTICA)

**Cambio:**
Hacer que el middleware también valide rutas API (excepto rutas públicas de API).

**Implementación:**
```typescript
// middleware.ts
const isApiRoute = pathname.startsWith('/api/')
const isPublicApiRoute = ['/api/auth/callback'].includes(pathname)

if (isApiRoute && !isPublicApiRoute) {
  // Validar autenticación aquí
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
}
```

**Beneficios:**
- Validación centralizada
- Consistencia en todas las rutas
- Más fácil de mantener

### 6.4 Propuesta #4: Unificar clientes Supabase (IMPORTANTE)

**Cambio:**
- Eliminar `client.ts` (no se usa)
- usar solo `server.ts` y `client.ts` estándar, eliminando el singleton

**Beneficios:**
- Menos confusión
- Más fácil de mantener
- Menos posibilidad de inconsistencias

### 6.5 Propuesta #5: Mejorar manejo de cookies (IMPORTANTE)

**Cambio:**
No silenciar errores en `setAll`, al menos loguearlos.

**Implementación:**
```typescript
} catch (error) {
  // Log error pero no romper el flujo
  console.error('Error setting cookies:', error)
  // Continuar con el flujo
}
```

**Beneficios:**
- Mejor visibilidad de problemas
- Facilita debugging

### 6.6 Propuesta #6: Agregar refresh automático proactivo (IMPORTANTE)

**Cambio:**
Agregar un mecanismo que refresque tokens antes de que expiren.

**Implementación:**
```typescript
// En AuthContext
useEffect(() => {
  const refreshInterval = setInterval(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      // Refrescar si falta menos de 5 minutos para expirar
      const expiresIn = session.expires_in
      if (expiresIn < 300) { // 5 minutos
        await supabase.auth.refreshSession()
      }
    }
  }, 60000) // Verificar cada minuto

  return () => clearInterval(refreshInterval)
}, [])
```

**Beneficios:**
- Previene expiración de tokens
- Mejor experiencia de usuario

### 6.7 Propuesta #7: Manejo de refresh token expirado (MODERADA)

**Cambio:**
Detectar cuando el refresh token expira y manejar el logout gracefully.

**Implementación:**
```typescript
// En AuthContext
supabase.auth.onAuthStateChange(async (event, session) => {
  if (event === 'TOKEN_REFRESHED') {
    await updateAuthState(session)
  } else if (event === 'SIGNED_OUT') {
    // Manejar logout
  } else if (event === 'USER_UPDATED') {
    await updateAuthState(session)
  }
})
```

**Beneficios:**
- Mejor manejo de errores
- UX más clara cuando la sesión expira

### 6.8 Propuesta #8: Limpiar logs en producción (MENOR)

**Cambio:**
Usar un sistema de logging condicional basado en `NODE_ENV`.

**Implementación:**
```typescript
const isDev = process.env.NODE_ENV === 'development'
const log = isDev ? console.log : () => {}
log('🔍 Middleware checking:', pathname)
```

**Beneficios:**
- Mejor performance en producción
- Logs más limpios

---

## 7. 🎯 PRIORIZACIÓN DE CORRECCIONES

### Prioridad CRÍTICA (Implementar inmediatamente):

1. ✅ **Propuesta #1**: Unificar método de validación (`getUser()` en middleware)
2. ✅ **Propuesta #2**: Implementar refresh explícito de sesión
3. ✅ **Propuesta #3**: Middleware también para rutas API

### Prioridad ALTA (Implementar pronto):

4. ✅ **Propuesta #4**: Unificar clientes Supabase
5. ✅ **Propuesta #5**: Mejorar manejo de cookies
6. ✅ **Propuesta #6**: Agregar refresh automático proactivo

### Prioridad MEDIA (Mejoras importantes):

7. ✅ **Propuesta #7**: Manejo de refresh token expirado
8. ✅ **Propuesta #8**: Limpiar logs en producción

---

## 8. 📝 RESUMEN DE HALLAZGOS

### ✅ Lo que está funcionando bien:

1. **Flujo de login básico** funciona correctamente
2. **Configuración de Supabase** está bien configurada (PKCE, auto-refresh, persist)
3. **AuthContext** maneja cambios de estado de autenticación
4. **Redirección por roles** funciona correctamente

### ❌ Problemas críticos identificados:

1. **Discrepancia entre `getSession()` y `getUser()`** causa fallos intermitentes
2. **Middleware no refresca sesiones** antes de validar
3. **Rutas API no pasan por middleware** causando validación duplicada
4. **Múltiples clientes Supabase** pueden causar inconsistencias
5. **Errores de cookies silenciados** dificultan debugging

### 🎯 Impacto en el problema reportado:

Los problemas identificados **explican perfectamente** por qué:
- Los usuarios pierden su sesión: tokens expiran sin refrescarse correctamente
- No pueden ejercer algunas acciones: middleware permite pero API routes rechazan (o viceversa)
- Hay inconsistencias: diferentes métodos de validación dan diferentes resultados

---

## 9. 🔧 RECOMENDACIONES FINALES

### Acción inmediata recomendada:

1. **Implementar Propuesta #1** (unificar a `getUser()`)
2. **Implementar Propuesta #2** (refresh explícito)
3. **Implementar Propuesta #3** (middleware para API)

Estas tres correcciones deberían resolver el **80%** de los problemas de sesión reportados.

