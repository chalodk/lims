'use client'

import { useState, useRef, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { User, LogOut, Loader2, ChevronDown } from 'lucide-react'
import { APP_VERSION } from '@/config/app'

export default function UserProfileDropdown() {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)
  const { user, authUser, userRole, signOut, isLoading } = useAuth()
  const [isLoggingOut, setIsLoggingOut] = useState(false)

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
    try {
      await signOut()
    } catch (error) {
      console.error('Logout error:', error)
      setIsLoggingOut(false)
    }
    // No resetear isLoggingOut aquí porque el componente se desmontará al redirigir
  }

  // Obtener nombre completo del usuario desde la tabla de perfiles
  const userName = user?.name || 'Usuario'
  const userEmail = authUser?.email || ''
  const appVersion = APP_VERSION

  // No mostrar el componente si no hay usuario autenticado
  if (!user && !authUser) {
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
        <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-lg border border-gray-200 py-2 z-50">
          {/* Correo electrónico y Rol */}
          <div className="px-4 py-3 border-b border-gray-200">
            <p className="text-xs text-gray-500 mb-1">Correo electrónico</p>
            <p className="text-sm text-gray-900 truncate mb-2">{userEmail}</p>
            <p className="text-xs text-gray-500 mb-1">Rol</p>
            <p className="text-sm text-gray-900 capitalize">{userRole || 'Usuario'}</p>
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
    </div>
  )
}

