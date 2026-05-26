'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { FlaskConical, Loader2, Plus, Edit, X, Check, ToggleLeft, ToggleRight } from 'lucide-react'

interface MethodologyOption {
  id: string
  name: string
  category: 'methodology' | 'technique'
  active: boolean
  created_at: string
}

export default function MethodologyOptionsPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()

  const [options, setOptions] = useState<MethodologyOption[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  // New option form
  const [newName, setNewName] = useState('')
  const [newCategory, setNewCategory] = useState<'methodology' | 'technique'>('methodology')

  // Inline editing
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editName, setEditName] = useState('')

  const fetchOptions = useCallback(async () => {
    setIsLoading(true)
    try {
      const res = await fetch('/api/admin/methodology-options?all=true')
      if (res.ok) {
        const data = await res.json()
        setOptions(data.methodology_options || [])
      }
    } catch {
      setError('Error al cargar opciones')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated && userRole === 'csx') {
      fetchOptions()
    }
  }, [authLoading, isAuthenticated, userRole, fetchOptions])

  const handleCreate = async () => {
    if (!newName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/methodology-options', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newName.trim(), category: newCategory }),
      })
      if (res.ok) {
        const data = await res.json()
        setOptions((prev) => [...prev, data.methodology_option])
        setNewName('')
        setIsCreating(false)
        setSuccessMsg('Opcion creada correctamente')
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        const err = await res.json()
        setError(err.error || 'Error al crear opcion')
      }
    } catch {
      setError('Error al crear opcion')
    } finally {
      setIsSaving(false)
    }
  }

  const handleToggleActive = async (option: MethodologyOption) => {
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/methodology-options/${option.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: !option.active }),
      })
      if (res.ok) {
        setOptions((prev) =>
          prev.map((o) => (o.id === option.id ? { ...o, active: !o.active } : o))
        )
      } else {
        const err = await res.json()
        setError(err.error || 'Error al actualizar')
      }
    } catch {
      setError('Error al actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (option: MethodologyOption) => {
    setEditingId(option.id)
    setEditName(option.name)
  }

  const handleSaveEdit = async (id: string) => {
    if (!editName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/methodology-options/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: editName.trim() }),
      })
      if (res.ok) {
        setOptions((prev) =>
          prev.map((o) => (o.id === id ? { ...o, name: editName.trim() } : o))
        )
        setEditingId(null)
        setSuccessMsg('Opcion actualizada')
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        const err = await res.json()
        setError(err.error || 'Error al actualizar')
      }
    } catch {
      setError('Error al actualizar')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm('Eliminar esta opcion permanentemente?')) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/methodology-options/${id}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        setOptions((prev) => prev.filter((o) => o.id !== id))
        setSuccessMsg('Opcion eliminada')
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        const err = await res.json()
        setError(err.error || 'Error al eliminar')
      }
    } catch {
      setError('Error al eliminar')
    } finally {
      setIsSaving(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated) {
    router.replace('/login')
    return null
  }

  if (userRole !== 'csx') {
    router.replace('/dashboard')
    return null
  }

  const methodologies = options.filter((o) => o.category === 'methodology')
  const techniques = options.filter((o) => o.category === 'technique')

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <FlaskConical className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Metodologias y Tecnicas</h1>
          </div>
          <p className="text-gray-600">
            Gestiona las opciones de metodologia y tecnicas de identificacion disponibles en los resultados.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
            <p className="text-sm text-red-700">{error}</p>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
        )}

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Metodologias */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Metodologias ({methodologies.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {methodologies.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === option.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(option.id)}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${option.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                            {option.name}
                          </span>
                          {!option.active && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(option)}
                        disabled={isSaving}
                        className={`p-1 ${option.active ? 'text-green-600' : 'text-gray-400'}`}
                        title={option.active ? 'Desactivar' : 'Activar'}
                      >
                        {option.active ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleStartEdit(option)}
                        disabled={isSaving || editingId !== null}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Renombrar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new methodology */}
                {isCreating && newCategory === 'methodology' ? (
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nueva metodologia..."
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={isSaving || !newName.trim()}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false)
                        setNewName('')
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsCreating(true)
                      setNewCategory('methodology')
                      setNewName('')
                    }}
                    className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar metodologia</span>
                  </button>
                )}
              </div>
            </div>

            {/* Tecnicas */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-4 border-b border-gray-200">
                <h2 className="text-lg font-semibold text-gray-900">
                  Tecnicas de Identificacion ({techniques.length})
                </h2>
              </div>
              <div className="p-4 space-y-2">
                {techniques.map((option) => (
                  <div
                    key={option.id}
                    className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0"
                  >
                    <div className="flex-1 min-w-0">
                      {editingId === option.id ? (
                        <div className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={editName}
                            onChange={(e) => setEditName(e.target.value)}
                            className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                          <button
                            onClick={() => handleSaveEdit(option.id)}
                            disabled={isSaving}
                            className="text-green-600 hover:text-green-800"
                          >
                            <Check className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="text-gray-400 hover:text-gray-600"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center space-x-2">
                          <span className={`text-sm ${option.active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                            {option.name}
                          </span>
                          {!option.active && (
                            <span className="text-xs bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded">
                              Inactivo
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                    <div className="flex items-center space-x-1 ml-2 shrink-0">
                      <button
                        onClick={() => handleToggleActive(option)}
                        disabled={isSaving}
                        className={`p-1 ${option.active ? 'text-green-600' : 'text-gray-400'}`}
                        title={option.active ? 'Desactivar' : 'Activar'}
                      >
                        {option.active ? (
                          <ToggleRight className="h-5 w-5" />
                        ) : (
                          <ToggleLeft className="h-5 w-5" />
                        )}
                      </button>
                      <button
                        onClick={() => handleStartEdit(option)}
                        disabled={isSaving || editingId !== null}
                        className="p-1 text-gray-400 hover:text-gray-600"
                        title="Renombrar"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                ))}

                {/* Add new technique */}
                {isCreating && newCategory === 'technique' ? (
                  <div className="flex items-center space-x-2 pt-2">
                    <input
                      type="text"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
                      placeholder="Nueva tecnica..."
                      className="flex-1 px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                      autoFocus
                      onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
                    />
                    <button
                      onClick={handleCreate}
                      disabled={isSaving || !newName.trim()}
                      className="text-green-600 hover:text-green-800 disabled:opacity-50"
                    >
                      <Check className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => {
                        setIsCreating(false)
                        setNewName('')
                      }}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => {
                      setIsCreating(true)
                      setNewCategory('technique')
                      setNewName('')
                    }}
                    className="flex items-center space-x-1 text-sm text-green-600 hover:text-green-800 mt-2"
                  >
                    <Plus className="h-4 w-4" />
                    <span>Agregar tecnica</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
