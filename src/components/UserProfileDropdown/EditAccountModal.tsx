'use client'

import { useState, useEffect } from 'react'
import { X, User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'

interface EditAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditAccountModal({ isOpen, onClose, onSuccess }: EditAccountModalProps) {
  const { user, authUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  
  const [formData, setFormData] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })

  // Actualizar formData cuando cambie el usuario
  useEffect(() => {
    if (user) {
      setFormData(prev => ({
        ...prev,
        name: user.name || ''
      }))
    }
  }, [user])

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: user?.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      })
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      // Validar que si se cambia la contraseña, se ingresen todos los campos
      const isChangingPassword = formData.newPassword.trim() !== '' || 
                                  formData.confirmPassword.trim() !== '' || 
                                  formData.currentPassword.trim() !== ''

      if (isChangingPassword) {
        if (!formData.currentPassword.trim()) {
          setError('Debes ingresar tu contraseña actual para cambiarla')
          setIsSubmitting(false)
          return
        }
        if (!formData.newPassword.trim()) {
          setError('Debes ingresar una nueva contraseña')
          setIsSubmitting(false)
          return
        }
        if (formData.newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres')
          setIsSubmitting(false)
          return
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden')
          setIsSubmitting(false)
          return
        }
        if (formData.currentPassword === formData.newPassword) {
          setError('La nueva contraseña debe ser diferente a la actual')
          setIsSubmitting(false)
          return
        }
      }

      // Validar nombre
      if (!formData.name.trim()) {
        setError('El nombre es obligatorio')
        setIsSubmitting(false)
        return
      }

      // Llamar a la API
      const response = await fetch('/api/auth/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          ...(isChangingPassword && {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword
          })
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la cuenta')
      }

      setSuccess(true)
      // Limpiar campos de contraseña
      setFormData(prev => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: ''
      }))
      
      // Cerrar después de mostrar éxito
      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la cuenta')
    } finally {
      setIsSubmitting(false)
    }
  }

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
                    <User className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Mi Cuenta
                    </h3>
                    <p className="text-sm text-gray-500">
                      Actualiza tu información personal y contraseña
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
                  ¡Cuenta actualizada exitosamente!
                </div>
              )}

              <div className="space-y-4">
                {/* Email (solo lectura) */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <input
                    type="email"
                    id="email"
                    value={authUser?.email || ''}
                    disabled
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm bg-gray-50 text-gray-500 cursor-not-allowed"
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    El correo electrónico no se puede modificar
                  </p>
                </div>

                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <div className="relative">
                    <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="text"
                      id="name"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="Tu nombre completo"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Separador */}
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Cambiar contraseña</h4>
                  <p className="text-xs text-gray-500 mb-4">
                    Deja estos campos vacíos si no deseas cambiar tu contraseña
                  </p>
                </div>

                {/* Contraseña actual */}
                <div>
                  <label htmlFor="currentPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña actual
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showCurrentPassword ? 'text' : 'password'}
                      id="currentPassword"
                      value={formData.currentPassword}
                      onChange={(e) => setFormData({ ...formData, currentPassword: e.target.value })}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showCurrentPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Nueva contraseña */}
                <div>
                  <label htmlFor="newPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showNewPassword ? 'text' : 'password'}
                      id="newPassword"
                      value={formData.newPassword}
                      onChange={(e) => setFormData({ ...formData, newPassword: e.target.value })}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showNewPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    Mínimo 6 caracteres
                  </p>
                </div>

                {/* Confirmar contraseña */}
                <div>
                  <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700 mb-1">
                    Confirmar nueva contraseña
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showConfirmPassword ? 'text' : 'password'}
                      id="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>
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
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
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

