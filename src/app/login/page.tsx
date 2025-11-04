'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { Eye, EyeOff, Loader2, Mail, Lock } from 'lucide-react'
import Image from 'next/image'
import { AuthApiError, AuthInvalidCredentialsError } from '@supabase/supabase-js'

export default function LoginPage() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [isSignUp, setIsSignUp] = useState(false)
  
  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`
          }
        })
        
        if (error) {
          if (error instanceof AuthApiError) {
            setError('Error del servidor. Intenta nuevamente.')
          } else {
            setError(error.message)
          }
        } else {
          alert('Check your email for the confirmation link!')
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password
        })
        
        if (error) {
          if (error instanceof AuthInvalidCredentialsError) {
            setError('Credenciales incorrectas. Verifica tu email y contraseña.')
          } else if (error instanceof AuthApiError) {
            setError('Error del servidor. Intenta nuevamente.')
          } else {
            setError('Error inesperado. Intenta nuevamente.')
          }
        } else {
          // Obtener el rol del usuario para redirigir según su rol
          const { data: { user } } = await supabase.auth.getUser()
          if (user) {
            // Obtener el rol del usuario desde la base de datos
            const { data: userData } = await supabase
              .from('users')
              .select('role_id, roles(name)')
              .eq('id', user.id)
              .single()
            
            if (userData) {
              // Definir tipo para roleData para evitar errores de TypeScript
              type RoleData = { id: number; name: string } | { id: number; name: string }[]
              const roleData = userData.roles as RoleData
              const roleName = Array.isArray(roleData) 
                ? roleData[0]?.name 
                : (roleData as { id: number; name: string })?.name
              
              // Redirigir según el rol: consumidor va a /reports, otros a /dashboard
              if (roleName === 'consumidor') {
                router.push('/reports')
              } else {
                router.push('/dashboard')
              }
            } else {
              // Fallback si no se puede obtener el usuario
              router.push('/dashboard')
            }
          } else {
            // Fallback si no se puede obtener el usuario
            router.push('/dashboard')
          }
        }
      }
    } catch (error) {
      console.error('Login error:', error)
      setError('Error inesperado. Intenta nuevamente.')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="max-w-md w-full mx-4">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex justify-center mb-4">
            <Image
              src="https://mknzstzwhbfoyxzfudfw.supabase.co/storage/v1/object/public/images/ORG_logo_NEMACHILE_(R)_01.08.23.ai.png"
              alt="Logo del Laboratorio"
              width={250}
              height={100}
              className="h-auto"
            />
          </div>
        </div>

        {/* Login Form */}
        <div className="bg-white shadow-xl rounded-2xl p-8 space-y-6">
          <div className="text-center">
            <h2 className="text-xl font-semibold text-gray-900">
              {isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}
            </h2>
            <p className="text-sm text-gray-600 mt-1">
              {isSignUp 
                ? 'Regístrate para acceder al sistema'
                : 'Accede a tu cuenta del laboratorio'
              }
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="tu@laboratorio.com"
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
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full pl-10 pr-12 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 transition-colors"
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isLoading}
              className="w-full bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 px-4 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center space-x-2"
            >
              {isLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <span>{isSignUp ? 'Crear cuenta' : 'Iniciar sesión'}</span>
              )}
            </button>
          </form>

          {/* Toggle Mode */}
          <div className="text-center">
            <button
              type="button"
              onClick={() => setIsSignUp(!isSignUp)}
              className="text-sm text-green-600 hover:text-green-500 transition-colors"
            >
              {isSignUp 
                ? '¿Ya tienes cuenta? Inicia sesión' 
                : '¿No tienes cuenta? Crear cuenta'
              }
            </button>
          </div>
        </div>

        {/* Footer */}
        <div className="text-center mt-8">
          <p className="text-xs text-gray-500">
            Sistema seguro para la gestión de análisis fitopatológicos
          </p>
        </div>
      </div>
    </div>
  )
}