# 05 — Frontend

> Última actualización: 2026-05-20.

## Proposito

Este documento describe la organizacion del frontend: paginas, componentes, manejo de estado, hooks, y las reglas sobre cuando usar el cliente Supabase del navegador vs llamar a la API.

## Documentos relacionados

| Doc | Relacion |
|---|---|
| `01-arquitectura.md` | Arquitectura general, estructura de directorios |
| `02-autenticacion.md` | AuthContext, useAuth(), roles |
| `03-api-routes.md` | Endpoints disponibles para llamar via fetch |
| `06-multi-tenant.md` | Por que el frontend no filtra por company_id |

## Paginas (13)

| Ruta | Pagina | Descripcion |
|---|---|---|
| `/login` | `login/page.tsx` | Login con Supabase Auth UI |
| `/signup` | `signup/page.tsx` | Registro de nuevo usuario |
| `/setup-company` | `setup-company/page.tsx` | Onboarding: crear empresa post-registro |
| `/auth/callback` | `auth/callback/route.ts` | Callback de Supabase (intercambia code por session) |
| `/dashboard` | `dashboard/page.tsx` | Dashboard con stats, SLA, muestras recientes |
| `/samples` | `samples/page.tsx` | Listado de muestras con busqueda y filtros |
| `/results` | `results/page.tsx` | Listado de resultados con busqueda y bulk actions |
| `/reports` | `reports/page.tsx` | Listado de reportes |
| `/clients` | `clients/page.tsx` | Gestion de clientes |
| `/estadisticas` | `estadisticas/page.tsx` | Graficos y estadisticas avanzadas |
| `/settings` | `settings/` | Configuracion (usuarios, clientes, roles) |
| `/configuracion` | `configuracion/page.tsx` | Configuracion del sistema |
| `/test-db` | `test-db/page.tsx` | Herramienta de diagnostico de BD |

## Organizacion de componentes

```
src/components/
├── layout/          ← DashboardLayout, Sidebar, Navbar
├── auth/            ← Componentes de autenticacion
├── branding/        ← AppBrandingLogo, logo por instancia
├── samples/         ← EnhancedSampleForm, CreateSampleModal, EditSampleModal
├── results/         ← ResultsEntry, ViewResultModal, AddResultModal, DeleteResultConfirmModal
├── reports/         ← CreateReportModal, ReportViewer
├── clients/         ← EditClientModal, LinkUserClientsModal
├── dashboard/       ← StatsCards, SLACards, RecentSamplesTable
├── settings/        ← CreateUserModal, EditUserModal, UserRoleModal
├── estadisticas/    ← SamplesByMonthChart, ResultsByTypeChart
├── projects/        ← CreateProjectModal
└── UserProfileDropdown/ ← Dropdown de perfil en navbar
```

## Estado global

### AuthContext (`src/contexts/AuthContext.tsx`)

El contexto principal. Envuelve toda la app en el layout.

```ts
interface AuthState {
  user: User | null           // Fila de public.users
  authUser: AuthUser | null   // Usuario de GoTrue
  role: Role | null           // Rol completo
  userRole: RoleName | null   // Nombre del rol (admin, comun, etc.)
  isLoading: boolean          // true durante carga inicial
  isAuthenticated: boolean
  session: Session | null     // Session de Supabase
}

// Metodos
signOut(): Promise<void>
refreshSession(forceRefresh?: boolean): Promise<void>
```

**Cache interno**: `userDataCacheRef` guarda los datos de `users` + `roles` por 5 minutos. Despues de operaciones que modifican `company_id` o `role_id`, llamar `refreshSession(true)`.

**Token refresh**: intervalo de 60s. Si el token expira en <5 min, lo refresca proactivamente. Constantes en `src/lib/auth/constants.ts`.

### AppBrandingContext (`src/contexts/AppBrandingContext.tsx`)

Determina la marca blanca (nemachile vs LIMS generico) basado en el host header. Se inicializa via API route.

## Hooks

### useAuth() (`src/hooks/useAuth.ts`)

```ts
const { user, authUser, role, userRole, isLoading, isAuthenticated, session, signOut, refreshSession } = useAuth()
```

Wrapper de una linea sobre `AuthContext`. Todos los componentes que necesitan datos de usuario usan este hook.

### useReports() (`src/hooks/useReports.ts`)

Manejo de estado local para reportes (filtros, paginacion, creacion). Usa Zustand internamente.

## Reglas: cliente Supabase navegador vs API

### SI se permite usar browser Supabase client

- **AuthContext.tsx** — `onAuthStateChange`, `refreshSession`, `signOut` (necesita browser client si o si)
- **SLACards.tsx** — suscripcion realtime `supabase.channel()` (unico caso de realtime)
- **login/page.tsx** — formulario de login (usa Supabase Auth UI)
- **signup/page.tsx** — formulario de registro (usa Supabase Auth UI)
- **test-db/page.tsx** — herramienta de diagnostico (solo desarrollo)

### NO se permite — debe usar API routes

Todo lo demas, especialmente:
- Cualquier INSERT, UPDATE, DELETE
- Cualquier SELECT de datos de negocio (muestras, resultados, clientes, reportes)
- Cualquier query que filtre por `company_id`

La regla es simple: si estas en un componente que no es AuthContext, SLACards, login, signup, o test-db, usa `fetch('/api/...')`.

## Patrones de formulario

Conviven dos patrones en el codigo:

### Patron A: react-hook-form + zod (recomendado para formularios nuevos)

Usado en modales como `CreateReportModal`. Separa validacion, tipos y UI limpiamente.

```tsx
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'

const schema = z.object({
  name: z.string().min(1, 'Nombre requerido'),
  email: z.string().email('Email invalido'),
})

type FormData = z.infer<typeof schema>

function MyForm() {
  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema)
  })

  const onSubmit = async (data: FormData) => {
    const res = await fetch('/api/recurso', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    })
    if (!res.ok) {
      const { error } = await res.json()
      // mostrar error
    }
  }

  return <form onSubmit={handleSubmit(onSubmit)}>...</form>
}
```

### Patron B: useState + validacion manual

Usado en formularios mas simples como `EnhancedSampleForm`. Estado plano con `handleInputChange`:

```tsx
const [formData, setFormData] = useState({ name: '', email: '' })

const handleInputChange = (field: string, value: string) => {
  setFormData(prev => ({ ...prev, [field]: value }))
}

const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  const res = await fetch('/api/recurso', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(formData)
  })
  if (!res.ok) { /* manejar error */ }
}
```

## Patrones de modal

Los modales se manejan con estado local (no libreria):

```tsx
const [showModal, setShowModal] = useState(false)
const [editingId, setEditingId] = useState<string | null>(null)

// Abrir para crear
<button onClick={() => { setEditingId(null); setShowModal(true) }}>Crear</button>

// Abrir para editar
<button onClick={() => { setEditingId(item.id); setShowModal(true) }}>Editar</button>

// En el modal
{showModal && (
  <EditModal
    id={editingId}  // null = crear, string = editar
    onClose={() => setShowModal(false)}
    onSuccess={() => { setShowModal(false); refetch() }}
  />
)}
```

## Manejo de carga y errores

```tsx
// Estado de carga
const [isLoading, setIsLoading] = useState(true)

// Estado de error — NO ocultar errores al usuario
const [error, setError] = useState<string | null>(null)

if (isLoading) return <Loader2 className="animate-spin" />
if (error) return <div className="bg-red-50 text-red-600 p-4">{error}</div>

// NUNCA hacer esto:
// .catch(() => setResults([]))  ← oculta el error, el usuario ve "Sin resultados"
```

## Bulk actions

Las acciones en lote (validar, eliminar) siguen este patron en `results/page.tsx`:

```tsx
const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set())

// Checkbox por fila
<BulkRowSelectionCheckbox
  id={item.id}
  selected={selectedItems}
  onToggle={...}
/>

// Toolbar flotante cuando hay seleccion
{selectedItems.size > 0 && (
  <BulkSelectionToolbarRow
    count={selectedItems.size}
    onValidate={...}
    onDelete={...}
  />
)}
```

## Reglas

1. **Nunca `setResults([])` en un catch** — el usuario no sabe que fallo. Mostrar el error.
2. **No fetch dentro de `useEffect` sin dependencias** — usar `useCallback` + dependencias explicitas.
3. **No pasar el browser Supabase client a componentes hijos como prop** — usar hooks o API routes.
4. **Mensajes de UI en español** — botones, labels, errores, confirmaciones.
5. **No usar `any`** — todos los tipos deben ser explicitos o inferidos de `Database`.
6. **No usar `// @ts-ignore`** — si hay un error de tipos, resolverlo en `src/types/database.ts`.
