'use client'

import { useState, useEffect } from 'react'
import { X, User, Loader2 } from 'lucide-react'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  role_id?: number | null
  created_at: string
  isUnauthorized?: boolean
}

interface Role {
  id: number
  name: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onSuccess: () => void
}

export default function EditProfileModal({ isOpen, onClose, user, onSuccess }: EditProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    role_id: '' as string | number | null
  })

  // Cargar roles y datos del usuario cuando se abre el modal
  useEffect(() => {
    if (!isOpen || !user) return

    const loadData = async () => {
      try {
        setLoadingRoles(true)
        setError(null)
        
        // Primero obtener el role_id correcto del usuario desde la API
        let actualRoleId: number | null = null
        
        try {
          const userResponse = await fetch(`/api/settings/users/${user.id}/role`)
          if (userResponse.ok) {
            const userData = await userResponse.json()
            actualRoleId = userData.role_id || null
          }
        } catch (err) {
          console.error('Error al obtener role_id del usuario:', err)
          // Continuar con el método alternativo
        }
        
        // Si no se obtuvo desde la API, usar el role_id del prop o buscar por nombre
        if (actualRoleId === null && user.role_id !== null && user.role_id !== undefined) {
          actualRoleId = user.role_id
        }
        
        // Cargar roles disponibles
        const response = await fetch('/api/settings/roles')
        const data = await response.json()
        
        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar roles')
        }

        const loadedRoles = data.roles || []
        setRoles(loadedRoles)
        
        // Si aún no tenemos role_id, intentar buscarlo por nombre del rol
        if (actualRoleId === null && user.role && user.role !== 'Sin rol' && user.role !== 'Sin autorizar') {
          const roleNameMap: Record<string, string> = {
            'Administrador': 'admin',
            'admin': 'admin',
            'Validador': 'validador',
            'validador': 'validador',
            'Común': 'comun',
            'comun': 'comun',
            'Consumidor': 'consumidor',
            'consumidor': 'consumidor'
          }
          
          const roleNameInDB = roleNameMap[user.role] || user.role.toLowerCase()
          const role = loadedRoles.find((r: Role) => r.name === roleNameInDB)
          if (role) {
            actualRoleId = role.id
          }
        }
        
        // Establecer el formData con el role_id correcto del usuario que se está editando
        setFormData({
          name: user.name || '',
          role_id: actualRoleId
        })
      } catch (err) {
        console.error('Error al cargar datos:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoadingRoles(false)
      }
    }
    
    loadData()
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role_id: formData.role_id ? parseInt(formData.role_id.toString()) : null
          // No enviar email ya que no se puede editar
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar perfil')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !user) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      {user.isUnauthorized ? 'Autorizar Usuario' : 'Editar Perfil'}
                    </h3>
                    <p className="text-sm text-gray-500">
                      {user.isUnauthorized 
                        ? 'Completa el perfil y asigna un rol al usuario'
                        : 'Modifica los datos del perfil y asigna un rol'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                  disabled={isSubmitting}
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                  {error}
                </div>
              )}

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre del usuario"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Rol */}
                <div>
                  <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                    Rol
                  </label>
                  {loadingRoles ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Cargando roles...</span>
                    </div>
                  ) : (
                    <select
                      id="role_id"
                      value={formData.role_id !== null && formData.role_id !== undefined ? formData.role_id : ''}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value ? parseInt(e.target.value) : null })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Sin rol</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name === 'admin' ? 'Administrador' :
                           role.name === 'validador' ? 'Validador' :
                           role.name === 'comun' ? 'Común' :
                           role.name === 'consumidor' ? 'Consumidor' :
                           role.name}
                        </option>
                      ))}
                    </select>
                  )}
                  <p className="mt-1 text-xs text-gray-500">
                    Selecciona un rol para asignar permisos al usuario
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting || loadingRoles}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar Cambios'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                disabled={isSubmitting}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

