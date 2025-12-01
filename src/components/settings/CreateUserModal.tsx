'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, UserPlus, Loader2, Mail, Lock, Eye, EyeOff, Shield, Building2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'

interface Role {
  id: number
  name: string
  level: number
  description: string | null
}

interface Client {
  id: string
  name: string
  rut: string | null
}

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '' as string | number,
    client_id: '' as string | null
  })

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true)
    try {
      const response = await fetch('/api/settings/roles')
      if (!response.ok) throw new Error('Error al cargar roles')
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (err) {
      console.error('Error fetching roles:', err)
      setError('Error al cargar roles')
    } finally {
      setIsLoadingRoles(false)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true)
    try {
      const supabase = getSupabaseClient()
      
      if (!user?.company_id) {
        throw new Error('No se pudo obtener la compañía del usuario')
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, rut')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError('Error al cargar clientes')
    } finally {
      setIsLoadingClients(false)
    }
  }, [user?.company_id])

  // Cargar roles al abrir el modal
  useEffect(() => {
    if (isOpen) {
      fetchRoles()
    }
  }, [isOpen, fetchRoles])

  // Cargar clientes cuando se selecciona rol "consumidor"
  useEffect(() => {
    if (isOpen && formData.role_id && roles.length > 0) {
      const selectedRole = roles.find(r => r.id === formData.role_id)
      if (selectedRole?.name === 'consumidor') {
        fetchClients()
      } else {
        setFormData(prev => ({ ...prev, client_id: null }))
      }
    }
  }, [formData.role_id, isOpen, roles, fetchClients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role_id: formData.role_id ? Number(formData.role_id) : null,
          client_id: formData.client_id || null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Error al crear usuario')
        return
      }

      setSuccess(true)
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: '',
        client_id: null
      })
      
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setError('Error inesperado al crear usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: '',
        client_id: null
      })
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const selectedRole = roles.find(r => r.id === formData.role_id)
  const showClientSelector = selectedRole?.name === 'consumidor'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <UserPlus className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Crear Usuario
                    </h3>
                    <p className="text-sm text-gray-500">
                      Crea un nuevo usuario en el sistema
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleClose}
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

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                  ¡Usuario creado exitosamente!
                </div>
              )}

              <div className="space-y-4">
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Juan Pérez"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="usuario@ejemplo.com"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      required
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    La contraseña debe tener al menos 6 caracteres
                  </p>
                </div>

                {/* Rol */}
                <div>
                  <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Rol
                  </label>
                  {isLoadingRoles ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Cargando roles...</span>
                    </div>
                  ) : (
                    <select
                      id="role_id"
                      required
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value, client_id: null })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} {role.description && `- ${role.description}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {/* Cliente (solo si rol es consumidor) */}
                {showClientSelector && (
                  <div>
                    <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
                      <Building2 className="inline h-4 w-4 mr-1" />
                      Cliente
                    </label>
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Cargando clientes...</span>
                      </div>
                    ) : (
                      <select
                        id="client_id"
                        required
                        value={formData.client_id || ''}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        disabled={isSubmitting}
                      >
                        <option value="">Seleccione un cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name} {client.rut && `(${client.rut})`}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Los usuarios con rol &quot;consumidor&quot; deben estar asociados a un cliente
                    </p>
                  </div>
                )}
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting || success}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  'Crear Usuario'
                )}
              </button>
              <button
                type="button"
                onClick={handleClose}
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
