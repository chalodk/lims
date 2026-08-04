'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  Users,
  Loader2,
  Search,
  X,
  RefreshCw,
  Eye,
  Pencil,
  Trash2,
  Shield,
  UserPlus,
  Link2,
  FileText,
} from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatters'
import EditProfileModal from '@/components/settings/EditProfileModal'
import CreateUserModal from '@/components/settings/CreateUserModal'
import LinkUserClientsModal from '@/components/settings/LinkUserClientsModal'
import CompanyTemplatesModal from '@/components/settings/CompanyTemplatesModal'
import PlanUsageCard from '@/components/billing/PlanUsageCard'
import { useCompanyBillingUsage } from '@/hooks/useCompanyBillingUsage'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  role_id?: number | null
  client_id?: string | null
  client_name?: string | null
  created_at: string
  isUnauthorized?: boolean
}

function roleBadgeClass(role: string) {
  const colors: Record<string, string> = {
    admin: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    validador: 'border-sky-200 bg-sky-50 text-sky-800',
    comun: 'border-green-200 bg-green-50 text-green-800',
    consumidor: 'border-amber-200 bg-amber-50 text-amber-800',
    csx: 'border-teal-200 bg-teal-50 text-teal-800',
    'Sin autorizar': 'border-orange-200 bg-orange-50 text-orange-800',
  }
  return colors[role] || 'border-gray-200 bg-gray-50 text-gray-700'
}

function roleLabel(role: string) {
  const labels: Record<string, string> = {
    admin: 'Administrador',
    validador: 'Validador',
    comun: 'Común',
    consumidor: 'Consumidor',
    csx: 'Customer Success',
    'Sin autorizar': 'Sin autorizar',
  }
  return labels[role] || role
}

export default function SettingsPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const { usage: billingUsage, isLoading: billingLoading, error: billingError } = useCompanyBillingUsage(
    userRole === 'admin'
  )
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [linkingUser, setLinkingUser] = useState<UserProfile | null>(null)
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false)
  const [isCompanyTemplatesOpen, setIsCompanyTemplatesOpen] = useState(false)
  const initialLoadRef = useRef(true)

  const fetchUsers = useCallback(async (options?: { silent?: boolean }) => {
    const showFullPageLoader = !options?.silent
    try {
      if (showFullPageLoader) {
        setIsLoading(true)
      }
      setError(null)

      const params = new URLSearchParams()
      if (searchQuery.trim()) {
        params.append('search', searchQuery.trim())
      }

      const url = `/api/settings/users${params.toString() ? `?${params.toString()}` : ''}`
      const response = await fetch(url)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar usuarios')
      }

      setUsers(data.users || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar usuarios')
    } finally {
      if (showFullPageLoader) {
        setIsLoading(false)
      }
    }
  }, [searchQuery])

  const clearSearch = () => {
    setSearchQuery('')
  }

  const handleSearch = () => {
    fetchUsers()
  }

  const handleRefresh = () => {
    fetchUsers()
  }

  const handleViewProfile = (userId: string) => {
    console.log('Ver perfil:', userId)
  }

  const handleEditProfile = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user && user.role !== 'admin') {
      setEditingUser(user)
      setIsEditModalOpen(true)
    }
  }

  const handleEditSuccess = () => {
    void fetchUsers({ silent: true })
  }

  const handleLinkClient = (userId: string) => {
    const user = users.find((u) => u.id === userId)
    if (user && user.role === 'consumidor') {
      setLinkingUser(user)
      setIsLinkModalOpen(true)
    }
  }

  const handleDeleteProfile = async (userId: string, userName: string) => {
    if (
      !confirm(
        `¿Estás seguro de que deseas eliminar completamente el perfil de ${userName}?\n\nEsta acción es irreversible y eliminará:\n- El perfil del usuario\n- La cuenta de autenticación\n- Todos los datos asociados`
      )
    ) {
      return
    }

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/settings/users/${userId}`, {
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar usuario')
      }

      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    if (!authLoading) {
      if (!isAuthenticated) {
        router.replace('/login')
        return
      }

      if (isAuthenticated && userRole !== 'admin') {
        router.replace('/dashboard')
        return
      }

      if (isAuthenticated && userRole === 'admin' && initialLoadRef.current) {
        initialLoadRef.current = false
        fetchUsers()
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, isAuthenticated, userRole, router])

  if (authLoading || !isAuthenticated || userRole !== 'admin' || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Configuración
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona la configuración del sistema
            </p>
          </div>
          <Button type="button" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
            <UserPlus className="h-4 w-4" />
            Crear usuario
          </Button>
        </div>

        <PlanUsageCard
          usage={billingUsage}
          isLoading={billingLoading}
          error={billingError}
        />

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleSearch()
                }}
                placeholder="Buscar por nombre, email o rol..."
                className="pl-9 pr-9"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={clearSearch}
                  className="absolute inset-y-0 right-0 flex items-center pr-3 text-muted-foreground hover:text-foreground"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" onClick={handleSearch} disabled={isLoading} className="gap-2">
                <Search className="h-4 w-4" />
                Buscar
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={handleRefresh}
                disabled={isLoading}
                className="gap-2"
              >
                <RefreshCw className={cn('h-4 w-4', isLoading && 'animate-spin')} />
                Actualizar
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Users className="h-4 w-4 text-green-700" />
                  Gestión de perfiles
                </CardTitle>
                <CardDescription>
                  Lista de usuarios registrados en el sistema
                </CardDescription>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {users.length} usuario{users.length === 1 ? '' : 's'}
              </p>
            </div>
          </CardHeader>

          {error ? (
            <CardContent className="p-4">
              <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-800">
                {error}
              </div>
            </CardContent>
          ) : users.length === 0 ? (
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Users className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No hay usuarios</CardTitle>
              <CardDescription className="mb-4">
                Crea el primer usuario del sistema
              </CardDescription>
              <Button type="button" onClick={() => setIsCreateModalOpen(true)} className="gap-2">
                <UserPlus className="h-4 w-4" />
                Crear usuario
              </Button>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[160px]">Nombre</TableHead>
                    <TableHead className="min-w-[180px]">Email</TableHead>
                    <TableHead className="min-w-[120px]">Rol</TableHead>
                    <TableHead className="hidden whitespace-nowrap md:table-cell">
                      Fecha de creación
                    </TableHead>
                    <TableHead className="sticky right-0 w-36 bg-card text-right">
                      Acciones
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((user) => (
                    <TableRow key={user.id} className="hover:bg-accent/40">
                      <TableCell>
                        <p className="font-medium text-foreground">{user.name}</p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {user.email}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant="outline"
                          className={cn('font-normal', roleBadgeClass(user.role))}
                        >
                          {roleLabel(user.role)}
                        </Badge>
                        {user.client_name ? (
                          <span className="mt-1 block text-xs text-muted-foreground">
                            {user.client_name}
                          </span>
                        ) : null}
                      </TableCell>
                      <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                        {formatDateTime(user.created_at)}
                      </TableCell>
                      <TableCell className="sticky right-0 bg-card text-right">
                        {user.role === 'admin' ? (
                          <div
                            className="inline-flex items-center text-emerald-700"
                            title="Usuario protegido"
                          >
                            <Shield className="h-5 w-5" />
                          </div>
                        ) : (
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleViewProfile(user.id)}
                              title="Ver perfil"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {user.role === 'consumidor' ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => handleLinkClient(user.id)}
                                title="Vincular cliente"
                              >
                                <Link2 className="h-4 w-4" />
                              </Button>
                            ) : null}
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditProfile(user.id)}
                              title="Editar perfil"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteProfile(user.id, user.name)}
                              title="Eliminar perfil"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

        {userRole === 'admin' ? (
          <Card>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-base">
                <FileText className="h-4 w-4 text-green-700" />
                Modelos informes - PDF
              </CardTitle>
              <CardDescription>
                Personaliza los modelos de informe por tipo de análisis para tu empresa.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-4">
              <Button
                type="button"
                onClick={() => setIsCompanyTemplatesOpen(true)}
                className="gap-2"
              >
                <FileText className="h-4 w-4" />
                Configurar templates
              </Button>
            </CardContent>
          </Card>
        ) : null}

        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          user={editingUser}
          onSuccess={handleEditSuccess}
        />

        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleEditSuccess}
        />

        <LinkUserClientsModal
          isOpen={isLinkModalOpen}
          onClose={() => {
            setIsLinkModalOpen(false)
            setLinkingUser(null)
          }}
          user={linkingUser}
          onSuccess={handleEditSuccess}
        />

        <CompanyTemplatesModal
          isOpen={isCompanyTemplatesOpen}
          onClose={() => setIsCompanyTemplatesOpen(false)}
          onSuccess={() => {}}
        />
      </div>
    </DashboardLayout>
  )
}
