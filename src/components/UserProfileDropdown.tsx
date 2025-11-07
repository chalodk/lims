'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { User, LogOut, Loader2, ChevronDown, Settings } from 'lucide-react'
import { APP_VERSION } from '@/config/app'
import EditAccountModal from './UserProfileDropdown/EditAccountModal'

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, authUser, userRole, signOut, isLoading, refreshSession } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const [isAccountModalOpen, setIsAccountModalOpen] = useState(false)

  // Cerrar dropdown al hacer clic fuera
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  const handleSignOut = async () => {
    setIsLoggingOut(true)
    // Cerrar el dropdown inmediatamente
    setIsOpen(false)
    
    try {
      // Llamar a signOut que maneja la redirección
      await signOut()
      // No resetear isLoggingOut aquí porque el componente se desmontará al redirigir
    } catch (error) {
      console.error('Logout error:', error)
      // Si hay un error, intentar redirigir manualmente como fallback
      if (typeof window !== 'undefined') {
        setTimeout(() => {
          window.location.href = '/login'
        }, 500)
      } else {
        // Si no hay window, resetear el estado después de un tiempo
        setTimeout(() => {
          setIsLoggingOut(false)
        }, 2000)
      }
    }
  }

  // Obtener nombre completo del usuario desde la tabla de perfiles
  const userName = user?.name || authUser?.email?.split('@')[0] || 'Usuario'
  const userEmail = authUser?.email || ''
  const appVersion = APP_VERSION
  
  // Determinar el texto del rol a mostrar
  // Si userRole es null pero el usuario existe, significa que no tiene rol asignado
  const roleDisplay = userRole ? userRole : (user || authUser ? 'Sin rol' : 'Usuario')

  // Mostrar el componente solo si hay usuario autenticado (authUser)
  // No requerimos que exista en la tabla users para mostrar el dropdown
  if (!authUser) {
    return null
  }

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Botón del perfil */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center space-x-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors"
        aria-label="Abrir menú de perfil"
      >
        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
          <User className="h-5 w-5 text-green-600" />
        </div>
        <span className="text-sm font-medium text-gray-900 hidden sm:block">
          {userName}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-64 max-w-[calc(100vw-2rem)] sm:w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-[60]">
          {/* Correo electrónico y Rol */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Correo electrónico</p>
            <p className="text-sm text-gray-900 truncate mb-2">{userEmail}</p>
            <p className="text-xs text-gray-500 mb-1">Rol</p>
            <p className="text-sm text-gray-900 capitalize">{roleDisplay}</p>
          </div>

          {/* Sección Cuenta */}
          <div className="px-2 py-1 border-b border-gray-200">
            <button
              onClick={() => {
                setIsAccountModalOpen(true)
                setIsOpen(false)
              }}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              <Settings className="h-4 w-4 mr-3" />
              Cuenta
            </button>
          </div>

          {/* Botón Cerrar Sesión */}
          <div className="px-2 py-1">
            <button
              onClick={handleSignOut}
              disabled={isLoggingOut || isLoading}
              className="flex items-center w-full px-3 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoggingOut ? (
                <Loader2 className="h-4 w-4 mr-3 animate-spin" />
              ) : (
                <LogOut className="h-4 w-4 mr-3" />
              )}
              {isLoggingOut ? 'Cerrando sesión...' : 'Cerrar Sesión'}
            </button>
          </div>

          {/* Versión */}
          <div className="px-4 py-2 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              Versión {appVersion}
            </p>
          </div>
        </div>
      )}

      {/* Modal de edición de cuenta */}
      <EditAccountModal
        isOpen={isAccountModalOpen}
        onClose={() => setIsAccountModalOpen(false)}
        onSuccess={async () => {
          // Refrescar la sesión para obtener los datos actualizados
          await refreshSession()
        }}
      />
    </div>
  )
}

