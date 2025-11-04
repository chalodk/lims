'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Settings, Users, Loader2, Search, X, RefreshCw, Eye, Pencil, Trash2, Shield, UserPlus } from 'lucide-react'
import { formatDateTime } from '@/lib/utils/formatters'
import EditProfileModal from '@/components/settings/EditProfileModal'
import CreateUserModal from '@/components/settings/CreateUserModal'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  role_id?: number | null
  created_at: string
  isUnauthorized?: boolean
}

export default function SettingsPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [users, setUsers] = useState<UserProfile[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [editingUser, setEditingUser] = useState<UserProfile | null>(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)

  const fetchUsers = useCallback(async () => {
    try {
      setIsLoading(true)
      setError(null)
      
      // Construir URL con parámetro de búsqueda único
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
      setIsLoading(false)
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
    // TODO: Implementar ver perfil
    console.log('Ver perfil:', userId)
  }

  const handleEditProfile = (userId: string) => {
    const user = users.find(u => u.id === userId)
    if (user && user.role !== 'admin') {
      setEditingUser(user)
      setIsEditModalOpen(true)
    }
  }

  const handleEditSuccess = () => {
    fetchUsers() // Recargar la lista de usuarios
  }

  const handleDeleteProfile = async (userId: string, userName: string) => {
    if (!confirm(`¿Estás seguro de que deseas eliminar completamente el perfil de ${userName}?\n\nEsta acción es irreversible y eliminará:\n- El perfil del usuario\n- La cuenta de autenticación\n- Todos los datos asociados`)) {
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

      // Recargar la lista de usuarios
      await fetchUsers()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al eliminar usuario')
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    // Verificación inmediata: si no está cargando y no está autenticado, redirigir al login
    if (!authLoading) {
      if (!isAuthenticated) {
        // Redirigir inmediatamente al login si no hay sesión
        router.replace('/login')
        return
      }
      
      // Si está autenticado pero no es admin, redirigir al dashboard
      if (isAuthenticated && userRole !== 'admin') {
        router.replace('/dashboard')
        return
      }

      // Solo cargar usuarios si está autenticado y es admin
      if (isAuthenticated && userRole === 'admin') {
        fetchUsers()
      }
    }
  }, [authLoading, isAuthenticated, userRole, router, fetchUsers])

  // Si está cargando la autenticación, mostrar loader
  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  // Si no está autenticado, redirigir inmediatamente (no renderizar nada)
  // Esta es una verificación de seguridad adicional por si el useEffect no se ejecutó aún
  if (!isAuthenticated) {
    // Usar window.location para redirección inmediata y forzada
    if (typeof window !== 'undefined' && window.location.pathname !== '/login') {
      window.location.href = '/login'
    }
    return null
  }

  // Si no es admin, redirigir al dashboard (no renderizar nada)
  // Esta es una verificación de seguridad adicional por si el useEffect no se ejecutó aún
  if (userRole !== 'admin') {
    // Usar window.location para redirección inmediata y forzada
    if (typeof window !== 'undefined' && window.location.pathname !== '/dashboard') {
      window.location.href = '/dashboard'
    }
    return null
  }

  // Si está cargando usuarios, mostrar loader
  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <Settings className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Configuración</h1>
          </div>
          <p className="text-gray-600">
            Gestiona la configuración del sistema
          </p>
        </div>

        {/* Gestión de Perfiles */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center space-x-3">
              <Users className="h-6 w-6 text-green-600" />
              <h2 className="text-xl font-semibold text-gray-900">Gestión de Perfiles</h2>
            </div>
            <p className="text-sm text-gray-500 mt-1">
              Lista de todos los usuarios registrados en el sistema
            </p>
          </div>

          {/* Buscador y Botones */}
          <div className="p-6 border-b border-gray-200 bg-gray-50">
            <div className="flex items-center justify-between">
              {/* Buscador con botón de búsqueda */}
              <div className="flex items-center space-x-2 w-1/4">
                <div className="relative flex-1">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search className="h-5 w-5 text-gray-400" />
                  </div>
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        handleSearch()
                      }
                    }}
                    placeholder="Buscar por nombre, email o rol..."
                    className="block w-full pl-10 pr-10 py-3 border border-gray-300 rounded-md leading-5 bg-white placeholder-gray-500 focus:outline-none focus:placeholder-gray-400 focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  />
                  {searchQuery && (
                    <button
                      onClick={clearSearch}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-5 w-5" />
                    </button>
                  )}
                </div>
                <button
                  onClick={handleSearch}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Search className="h-5 w-5" />
                  <span>Buscar</span>
                </button>
              </div>
              
              {/* Botones a la derecha */}
              <div className="flex items-center space-x-3">
                <button
                  onClick={handleRefresh}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className={`h-5 w-5 ${isLoading ? 'animate-spin' : ''}`} />
                  <span>Actualizar</span>
                </button>
                <button
                  onClick={() => setIsCreateModalOpen(true)}
                  disabled={isLoading}
                  className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <UserPlus className="h-5 w-5" />
                  <span>Crear Usuario</span>
                </button>
              </div>
            </div>
            <p className="mt-2 text-sm text-gray-500">
              Ingresa tu búsqueda y presiona &quot;Buscar&quot; o Enter para filtrar usuarios
            </p>
          </div>

          <div className="p-6">
            {error ? (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-800">
                {error}
              </div>
            ) : users.length === 0 ? (
              <div className="text-center py-12">
                <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-500">No hay usuarios registrados</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Nombre
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Email
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Rol
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Fecha de Creación
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Acciones
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {users.map((user) => (
                      <tr key={user.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {user.name}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {user.email}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                            user.role === 'admin' 
                              ? 'bg-purple-100 text-purple-800'
                              : user.role === 'validador'
                              ? 'bg-blue-100 text-blue-800'
                              : user.role === 'comun'
                              ? 'bg-green-100 text-green-800'
                              : user.role === 'consumidor'
                              ? 'bg-yellow-100 text-yellow-800'
                              : user.role === 'Sin autorizar'
                              ? 'bg-orange-100 text-orange-800'
                              : 'bg-gray-100 text-gray-800'
                          }`}>
                            {user.role === 'admin' ? 'Administrador' :
                             user.role === 'validador' ? 'Validador' :
                             user.role === 'comun' ? 'Común' :
                             user.role === 'consumidor' ? 'Consumidor' :
                             user.role === 'Sin autorizar' ? 'Sin autorizar' :
                             user.role}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                          {formatDateTime(user.created_at)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          {user.role === 'admin' ? (
                            <div className="flex items-center space-x-1 text-purple-600" title="Usuario protegido">
                              <Shield className="h-5 w-5" />
                            </div>
                          ) : (
                            <div className="flex items-center space-x-2">
                              <button
                                onClick={() => handleViewProfile(user.id)}
                                className="text-blue-600 hover:text-blue-900 focus:outline-none focus:ring-2 focus:ring-blue-500 rounded p-1"
                                title="Ver perfil"
                              >
                                <Eye className="h-5 w-5" />
                              </button>
                              <button
                                onClick={() => handleEditProfile(user.id)}
                                className="text-green-600 hover:text-green-900 focus:outline-none focus:ring-2 focus:ring-green-500 rounded p-1"
                                title="Editar perfil"
                                disabled={user.role === 'admin'}
                              >
                                <Pencil className={`h-5 w-5 ${user.role === 'admin' ? 'opacity-50 cursor-not-allowed' : ''}`} />
                              </button>
                              <button
                                onClick={() => handleDeleteProfile(user.id, user.name)}
                                className="text-red-600 hover:text-red-900 focus:outline-none focus:ring-2 focus:ring-red-500 rounded p-1"
                                title="Eliminar perfil"
                              >
                                <Trash2 className="h-5 w-5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
          </div>
        </div>

        {/* Modal de Edición de Perfil */}
        <EditProfileModal
          isOpen={isEditModalOpen}
          onClose={() => {
            setIsEditModalOpen(false)
            setEditingUser(null)
          }}
          user={editingUser}
          onSuccess={handleEditSuccess}
        />

        {/* Modal de Crear Usuario */}
        <CreateUserModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={handleEditSuccess}
        />
      </DashboardLayout>
    )
  }

