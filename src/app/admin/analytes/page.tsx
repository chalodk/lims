'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { TestTube, Loader2, Plus, Edit, Trash2, X, Check, Search } from 'lucide-react'

interface Analyte {
  id: number
  code: string | null
  scientific_name: string
  type: string
}

const VALID_TYPES = ['virus', 'hongo', 'nematodo', 'bacteria', 'abiotico']

const TYPE_LABELS: Record<string, string> = {
  virus: 'Virus',
  hongo: 'Hongo',
  nematodo: 'Nematodo',
  bacteria: 'Bacteria',
  abiotico: 'Abiotico',
}

const TYPE_BADGE: Record<string, string> = {
  virus: 'bg-blue-100 text-blue-800',
  hongo: 'bg-amber-100 text-amber-800',
  nematodo: 'bg-purple-100 text-purple-800',
  bacteria: 'bg-red-100 text-red-800',
  abiotico: 'bg-gray-100 text-gray-800',
}

export default function AnalytesAdminPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()

  const [analytes, setAnalytes] = useState<Analyte[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')

  // Create form
  const [isCreating, setIsCreating] = useState(false)
  const [newScientificName, setNewScientificName] = useState('')
  const [newType, setNewType] = useState('virus')

  // Inline editing
  const [editingId, setEditingId] = useState<number | null>(null)
  const [editScientificName, setEditScientificName] = useState('')
  const [editType, setEditType] = useState('')

  const fetchAnalytes = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analytes')
      if (res.ok) {
        const data = await res.json()
        setAnalytes(data.analytes || [])
      } else {
        const err = await res.json()
        setError(err.error || 'Error al cargar analitos')
      }
    } catch {
      setError('Error al cargar analitos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated && userRole === 'csx') {
      fetchAnalytes()
    }
  }, [authLoading, isAuthenticated, userRole, fetchAnalytes])

  // Auth guards
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

  const handleCreate = async () => {
    if (!newScientificName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analytes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientific_name: newScientificName.trim(), type: newType }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnalytes((prev) => [...prev, data.analyte])
        setNewScientificName('')
        setIsCreating(false)
        setSuccessMsg('Analito creado correctamente')
        setTimeout(() => setSuccessMsg(null), 3000)
      } else {
        const err = await res.json()
        setError(err.error || 'Error al crear analito')
      }
    } catch {
      setError('Error al crear analito')
    } finally {
      setIsSaving(false)
    }
  }

  const handleStartEdit = (analyte: Analyte) => {
    setEditingId(analyte.id)
    setEditScientificName(analyte.scientific_name)
    setEditType(analyte.type)
  }

  const handleSaveEdit = async (id: number) => {
    if (!editScientificName.trim()) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytes/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scientific_name: editScientificName.trim(), type: editType }),
      })
      if (res.ok) {
        const data = await res.json()
        setAnalytes((prev) =>
          prev.map((a) => (a.id === id ? data.analyte : a))
        )
        setEditingId(null)
        setSuccessMsg('Analito actualizado')
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

  const handleDelete = async (id: number) => {
    if (!confirm('Eliminar este analito permanentemente?')) return
    setIsSaving(true)
    setError(null)
    try {
      const res = await fetch(`/api/admin/analytes/${id}`, { method: 'DELETE' })
      if (res.ok) {
        setAnalytes((prev) => prev.filter((a) => a.id !== id))
        setSuccessMsg('Analito eliminado')
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

  const filteredAnalytes = searchQuery
    ? analytes.filter((a) => {
        const q = searchQuery.toLowerCase()
        return (
          a.scientific_name.toLowerCase().includes(q) ||
          (a.code && a.code.toLowerCase().includes(q)) ||
          a.type.toLowerCase().includes(q)
        )
      })
    : analytes

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <TestTube className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Analitos</h1>
          </div>
          <p className="text-gray-600">
            Gestiona los analitos (virus, hongos, nematodos, bacterias, abioticos) disponibles en el sistema.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md flex items-center justify-between">
            <p className="text-sm text-red-700">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <X className="h-4 w-4" />
            </button>
          </div>
        )}

        {successMsg && (
          <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
        )}

        {/* Search and Add bar */}
        <div className="flex items-center justify-between mb-4 gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Buscar por nombre, codigo o tipo..."
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
          <button
            onClick={() => {
              setIsCreating(true)
              setNewScientificName('')
              setNewType('virus')
            }}
            className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-lg text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 shrink-0"
          >
            <Plus className="h-4 w-4 mr-1" />
            Agregar Analito
          </button>
        </div>

        {/* Create form */}
        {isCreating && (
          <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
              >
                {VALID_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              <input
                type="text"
                value={newScientificName}
                onChange={(e) => setNewScientificName(e.target.value)}
                placeholder="Nombre cientifico..."
                className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <button
                onClick={handleCreate}
                disabled={isSaving || !newScientificName.trim()}
                className="text-green-600 hover:text-green-800 disabled:opacity-50"
              >
                <Check className="h-5 w-5" />
              </button>
              <button
                onClick={() => setIsCreating(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        )}

        {/* Table */}
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-48">
                    Codigo
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Nombre Cientifico
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32">
                    Tipo
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider w-24">
                    Acciones
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredAnalytes.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                      {searchQuery ? 'Sin resultados para la busqueda' : 'No hay analitos registrados'}
                    </td>
                  </tr>
                ) : (
                  filteredAnalytes.map((analyte) => (
                    <tr key={analyte.id} className="hover:bg-gray-50">
                      <td className="px-6 py-3 whitespace-nowrap">
                        <span className="text-sm font-mono text-gray-600">
                          {analyte.code || '-'}
                        </span>
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {editingId === analyte.id ? (
                          <input
                            type="text"
                            value={editScientificName}
                            onChange={(e) => setEditScientificName(e.target.value)}
                            className="w-full px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                            autoFocus
                          />
                        ) : (
                          <span className="text-sm text-gray-900">{analyte.scientific_name}</span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap">
                        {editingId === analyte.id ? (
                          <select
                            value={editType}
                            onChange={(e) => setEditType(e.target.value)}
                            className="px-2 py-1 border border-gray-300 rounded text-sm focus:ring-2 focus:ring-green-500"
                          >
                            {VALID_TYPES.map((t) => (
                              <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                            ))}
                          </select>
                        ) : (
                          <span className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${TYPE_BADGE[analyte.type] || 'bg-gray-100 text-gray-800'}`}>
                            {TYPE_LABELS[analyte.type] || analyte.type}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-3 whitespace-nowrap text-right">
                        {editingId === analyte.id ? (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleSaveEdit(analyte.id)}
                              disabled={isSaving}
                              className="p-1 text-green-600 hover:text-green-800"
                            >
                              <Check className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => setEditingId(null)}
                              className="p-1 text-gray-400 hover:text-gray-600"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          </div>
                        ) : (
                          <div className="flex items-center justify-end space-x-1">
                            <button
                              onClick={() => handleStartEdit(analyte)}
                              disabled={isSaving || editingId !== null}
                              className="p-1 text-gray-400 hover:text-gray-600"
                              title="Editar"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(analyte.id)}
                              disabled={isSaving}
                              className="p-1 text-gray-400 hover:text-red-600"
                              title="Eliminar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}
