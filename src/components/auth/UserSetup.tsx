'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { FlaskConical, Building, User, Mail, Loader2 } from 'lucide-react'

interface UserSetupProps {
  authUser: {
    id: string
    email?: string
  }
}

export default function UserSetup({ authUser }: UserSetupProps) {
  const [formData, setFormData] = useState({
    name: '',
    company_name: '',
    specialization: '',
    role: 'comun',
  })
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const res = await fetch('/api/auth/setup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: formData.name,
          company_name: formData.company_name,
          specialization: formData.specialization,
          role: formData.role,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Error al crear perfil')
      }

      router.push('/dashboard')
    } catch (err: unknown) {
      console.error('Setup error:', err)
      setError(err instanceof Error ? err.message : 'Error al crear perfil')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 via-emerald-50 to-teal-50">
      <div className="mx-4 w-full max-w-md">
        <div className="mb-8 text-center">
          <div className="mb-4 flex justify-center">
            <div className="rounded-full bg-green-600 p-3">
              <FlaskConical className="h-8 w-8 text-white" />
            </div>
          </div>
          <h1 className="mb-2 text-3xl font-bold text-gray-900">Configurar perfil</h1>
          <p className="text-gray-600">Completa tu información para comenzar</p>
        </div>

        <div className="rounded-2xl bg-white p-8 shadow-xl">
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label htmlFor="name" className="mb-1 block text-sm font-medium text-gray-700">
                Nombre completo
              </label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="name"
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  placeholder="Tu nombre completo"
                />
              </div>
            </div>

            <div>
              <label htmlFor="email" className="mb-1 block text-sm font-medium text-gray-700">
                Correo electrónico
              </label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="email"
                  type="email"
                  disabled
                  value={authUser.email}
                  className="w-full rounded-lg border border-gray-300 bg-gray-50 py-2.5 pl-10 pr-4 text-gray-500"
                />
              </div>
            </div>

            <div>
              <label htmlFor="company" className="mb-1 block text-sm font-medium text-gray-700">
                Nombre del laboratorio/empresa
              </label>
              <div className="relative">
                <Building className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
                <input
                  id="company"
                  type="text"
                  required
                  value={formData.company_name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, company_name: e.target.value }))
                  }
                  className="w-full rounded-lg border border-gray-300 py-2.5 pl-10 pr-4 transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500"
                  placeholder="Laboratorio de Fitopatología XYZ"
                />
              </div>
            </div>

            <div>
              <label htmlFor="role" className="mb-1 block text-sm font-medium text-gray-700">
                Rol en el laboratorio
              </label>
              <select
                id="role"
                value={formData.role}
                onChange={(e) => setFormData((prev) => ({ ...prev, role: e.target.value }))}
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500"
              >
                <option value="admin">Administrador</option>
                <option value="validador">Validador</option>
                <option value="comun">Usuario común</option>
              </select>
              <p className="mt-1 text-xs text-gray-500">
                Puedes cambiar esto después desde configuración
              </p>
            </div>

            <div>
              <label
                htmlFor="specialization"
                className="mb-1 block text-sm font-medium text-gray-700"
              >
                Especialización (opcional)
              </label>
              <input
                id="specialization"
                type="text"
                value={formData.specialization}
                onChange={(e) =>
                  setFormData((prev) => ({ ...prev, specialization: e.target.value }))
                }
                className="w-full rounded-lg border border-gray-300 px-3 py-2.5 transition-colors focus:border-green-500 focus:ring-2 focus:ring-green-500"
                placeholder="Ej: Fitopatología, PCR, Microscopía"
              />
            </div>

            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            ) : null}

            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full items-center justify-center space-x-2 rounded-lg bg-green-600 px-4 py-2.5 font-medium text-white transition-colors hover:bg-green-700 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <span>Crear perfil</span>}
            </button>
          </form>
        </div>

        <div className="mt-8 text-center">
          <p className="text-xs text-gray-500">Tu información se almacena de forma segura</p>
        </div>
      </div>
    </div>
  )
}
