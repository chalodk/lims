'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Microscope, Loader2, Plus, Edit, Trash2, Save, X, Search, RefreshCw } from 'lucide-react'
import { AnalysisTypeRow } from '@/types/database'

interface FormData {
  key: string
  label: string
  initial: string
  bg_color: string
  text_color: string
  db_areas: string
  pdfmonkey_template_id: string
  template_env_var: string
  titulo_informe: string
  tipo_analisis_descripcion: string
  metodologia_descripcion: string
}

const emptyForm: FormData = {
  key: '',
  label: '',
  initial: '',
  bg_color: 'bg-gray-500',
  text_color: 'text-white',
  db_areas: '',
  pdfmonkey_template_id: '',
  template_env_var: '',
  titulo_informe: '',
  tipo_analisis_descripcion: '',
  metodologia_descripcion: '',
}

export default function AnalysisTypesAdminPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [isLoading, setIsLoading] = useState(true)
  const [types, setTypes] = useState<AnalysisTypeRow[]>([])
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [isCreating, setIsCreating] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [form, setForm] = useState<FormData>(emptyForm)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)

  const fetchTypes = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true)
    setError(null)
    try {
      const res = await fetch('/api/admin/analysis-types')
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Error al cargar')
      setTypes(data.analysis_types || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated && userRole === 'csx') {
      fetchTypes()
    }
  }, [authLoading, isAuthenticated, userRole, fetchTypes])

  // Auth guards
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      router.replace('/login')
    } else if (!authLoading && isAuthenticated && userRole !== 'csx') {
      router.replace('/dashboard')
    }
  }, [authLoading, isAuthenticated, userRole, router])

  const openCreate = () => {
    setForm(emptyForm)
    setFormError(null)
    setIsCreating(true)
    setEditingId(null)
  }

  const openEdit = (t: AnalysisTypeRow) => {
    setForm({
      key: t.key,
      label: t.label,
      initial: t.initial,
      bg_color: t.bg_color,
      text_color: t.text_color,
      db_areas: (t.db_areas || []).join(', '),
      pdfmonkey_template_id: t.pdfmonkey_template_id || '',
      template_env_var: t.template_env_var || '',
      titulo_informe: t.titulo_informe || '',
      tipo_analisis_descripcion: t.tipo_analisis_descripcion || '',
      metodologia_descripcion: t.metodologia_descripcion || '',
    })
    setFormError(null)
    setEditingId(t.id)
    setIsCreating(false)
  }

  const closeForm = () => {
    setIsCreating(false)
    setEditingId(null)
    setFormError(null)
  }

  const updateForm = (field: keyof FormData, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }))
  }

  const handleSave = async () => {
    setSaving(true)
    setFormError(null)

    const body = {
      ...form,
      initial: form.initial || form.label.charAt(0).toUpperCase(),
      db_areas: form.db_areas
        ? form.db_areas.split(',').map((s) => s.trim()).filter(Boolean)
        : [],
      pdfmonkey_template_id: form.pdfmonkey_template_id || null,
      template_env_var: form.template_env_var || null,
    }

    try {
      const url = editingId
        ? `/api/admin/analysis-types/${editingId}`
        : '/api/admin/analysis-types'
      const method = editingId ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      const data = await res.json()

      if (!res.ok) throw new Error(data.error || 'Error al guardar')

      closeForm()
      fetchTypes(true)
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Error desconocido')
    } finally {
      setSaving(false)
    }
  }

  const handleDeactivate = async (t: AnalysisTypeRow) => {
    if (!confirm(`Desactivar "${t.label}"?`)) return
    try {
      const res = await fetch(`/api/admin/analysis-types/${t.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al desactivar')
      }
      fetchTypes(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const handleReactivate = async (t: AnalysisTypeRow) => {
    try {
      const res = await fetch(`/api/admin/analysis-types/${t.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ active: true }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Error al reactivar')
      }
      fetchTypes(true)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error desconocido')
    }
  }

  const filteredTypes = searchQuery
    ? types.filter(
        (t) =>
          t.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
          t.key.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : types

  // Loading / auth guards
  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated || userRole !== 'csx') {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[60vh]">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <Microscope className="h-8 w-8 text-green-600" />
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Tipos de Analisis</h1>
              <p className="text-gray-600 mt-1">
                Gestiona los tipos de analisis del laboratorio. Los cambios se reflejan en la interfaz de generacion de informes.
              </p>
            </div>
          </div>
        </div>

        {/* Content card */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {/* Card header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex flex-col sm:flex-row gap-4 sm:items-center sm:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                  <Microscope className="h-5 w-5 text-green-600" />
                  Tipos registrados
                </h2>
                <p className="text-sm text-gray-500 mt-1">
                  {types.length} tipo{types.length !== 1 ? 's' : ''} en total
                </p>
              </div>
            </div>
          </div>

          {/* Actions bar */}
          <div className="px-6 py-3 bg-gray-50 border-b border-gray-200 flex flex-col sm:flex-row gap-3 sm:items-center sm:justify-between">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por key o label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => fetchTypes(true)}
                className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refrescar
              </button>
              <button
                onClick={openCreate}
                className="inline-flex items-center px-3 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo tipo
              </button>
            </div>
          </div>

          {/* Error banner */}
          {error && (
            <div className="mx-6 mt-4 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
              {error}
              <button onClick={() => setError(null)} className="ml-2 underline">Cerrar</button>
            </div>
          )}

          {/* Form modal (inline) */}
          {(isCreating || editingId) && (
            <div className="m-6 p-6 bg-gray-50 border border-gray-200 rounded-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">
                  {isCreating ? 'Nuevo tipo de analisis' : 'Editar tipo de analisis'}
                </h3>
                <button onClick={closeForm} className="p-1 hover:bg-gray-200 rounded">
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>

              {formError && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-red-700 text-sm">
                  {formError}
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Key *</label>
                  <input
                    type="text"
                    value={form.key}
                    onChange={(e) => updateForm('key', e.target.value)}
                    placeholder="virology"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Identificador unico en ingles, sin espacios.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Label *</label>
                  <input
                    type="text"
                    value={form.label}
                    onChange={(e) => updateForm('label', e.target.value)}
                    placeholder="Virologico"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Inicial</label>
                  <input
                    type="text"
                    value={form.initial}
                    onChange={(e) => updateForm('initial', e.target.value)}
                    placeholder="V"
                    maxLength={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color fondo</label>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={form.bg_color}
                      onChange={(e) => updateForm('bg_color', e.target.value)}
                      placeholder="bg-indigo-600"
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                    />
                    <span className={`w-8 h-8 rounded-full ${form.bg_color}`} />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Color texto</label>
                  <input
                    type="text"
                    value={form.text_color}
                    onChange={(e) => updateForm('text_color', e.target.value)}
                    placeholder="text-white"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">DB Areas</label>
                  <input
                    type="text"
                    value={form.db_areas}
                    onChange={(e) => updateForm('db_areas', e.target.value)}
                    placeholder="virologia, bacteriologia"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                  <p className="text-xs text-gray-500 mt-1">Separadas por coma. Ej: nematologia, fitopatologia.</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Template Env Var</label>
                  <input
                    type="text"
                    value={form.template_env_var}
                    onChange={(e) => updateForm('template_env_var', e.target.value)}
                    placeholder="PDFMONKEY_TEMPLATE_VIROLOGY"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">PDFMonkey Template ID</label>
                  <input
                    type="text"
                    value={form.pdfmonkey_template_id}
                    onChange={(e) => updateForm('pdfmonkey_template_id', e.target.value)}
                    placeholder="00000000-0000-0000-0000-000000000000"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-4 grid grid-cols-1 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Titulo informe</label>
                  <input
                    type="text"
                    value={form.titulo_informe}
                    onChange={(e) => updateForm('titulo_informe', e.target.value)}
                    placeholder="INFORME VIROLOGICO"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion tipo analisis</label>
                  <textarea
                    value={form.tipo_analisis_descripcion}
                    onChange={(e) => updateForm('tipo_analisis_descripcion', e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Descripcion metodologia</label>
                  <textarea
                    value={form.metodologia_descripcion}
                    onChange={(e) => updateForm('metodologia_descripcion', e.target.value)}
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="mt-6 flex justify-end gap-2">
                <button
                  onClick={closeForm}
                  className="px-4 py-2 border border-gray-300 rounded-lg text-sm font-medium text-gray-700 bg-white hover:bg-gray-100"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleSave}
                  disabled={saving || !form.key || !form.label}
                  className="inline-flex items-center px-4 py-2 border border-transparent rounded-lg text-sm font-medium text-white bg-green-600 hover:bg-green-700 disabled:opacity-50"
                >
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  {editingId ? 'Guardar cambios' : 'Crear tipo'}
                </button>
              </div>
            </div>
          )}

          {/* Table */}
          <div className="overflow-x-auto">
            {filteredTypes.length === 0 && !isLoading ? (
              <div className="p-12 text-center text-gray-500">
                {searchQuery ? 'Sin resultados para esta busqueda.' : 'No hay tipos de analisis registrados.'}
              </div>
            ) : (
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tipo</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DB Areas</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Template</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Activo</th>
                    <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Acciones</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredTypes.map((t) => (
                    <tr key={t.id} className={!t.active ? 'opacity-50' : ''}>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center gap-3">
                          <span className={`w-8 h-8 rounded-full ${t.bg_color} ${t.text_color} flex items-center justify-center text-sm font-bold`}>
                            {t.initial}
                          </span>
                          <span className="font-medium text-gray-900">{t.label}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <code className="text-xs bg-gray-100 px-2 py-1 rounded">{t.key}</code>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {(t.db_areas || []).map((area) => (
                            <span key={area} className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {area}
                            </span>
                          ))}
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.template_env_var ? (
                          <code className="text-xs bg-gray-100 px-2 py-1 rounded">{t.template_env_var}</code>
                        ) : (
                          <span className="text-gray-400 text-xs">—</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {t.active ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">Activo</span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800">Inactivo</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => openEdit(t)}
                            className="p-1 hover:bg-gray-100 rounded text-gray-600"
                            title="Editar"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          {t.active ? (
                            <button
                              onClick={() => handleDeactivate(t)}
                              className="p-1 hover:bg-red-50 rounded text-red-600"
                              title="Desactivar"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => handleReactivate(t)}
                              className="p-1 hover:bg-green-50 rounded text-green-600"
                              title="Reactivar"
                            >
                              <RefreshCw className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
