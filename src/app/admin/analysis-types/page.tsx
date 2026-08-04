'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Microscope, Loader2, Plus, Edit, Trash2, Save, X, Search, RefreshCw } from 'lucide-react'
import { AnalysisTypeRow } from '@/types/database'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'

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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Tipos de análisis
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los tipos de análisis del laboratorio. Los cambios se reflejan en la interfaz de generación de informes.
            </p>
          </div>
          <Button type="button" onClick={openCreate} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo tipo
          </Button>
        </div>

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por key o label..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
            <Button type="button" variant="outline" onClick={() => fetchTypes(true)} className="gap-2">
              <RefreshCw className="h-4 w-4" />
              Refrescar
            </Button>
          </CardContent>
        </Card>

        {error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {error}
            <button type="button" onClick={() => setError(null)} className="ml-2 underline">
              Cerrar
            </button>
          </div>
        ) : null}

        {(isCreating || editingId) && (
          <Card>
            <CardHeader className="border-b border-gray-100">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">
                  {isCreating ? 'Nuevo tipo de análisis' : 'Editar tipo de análisis'}
                </CardTitle>
                <Button type="button" variant="ghost" size="icon-sm" onClick={closeForm}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 p-4">
              {formError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
                  {formError}
                </div>
              ) : null}

              <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Key *</label>
                  <Input type="text" value={form.key} onChange={(e) => updateForm('key', e.target.value)} placeholder="virology" className={fieldClassName} />
                  <p className="mt-1 text-xs text-muted-foreground">Identificador único en inglés, sin espacios.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Label *</label>
                  <Input type="text" value={form.label} onChange={(e) => updateForm('label', e.target.value)} placeholder="Virologico" className={fieldClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Inicial</label>
                  <Input type="text" value={form.initial} onChange={(e) => updateForm('initial', e.target.value)} placeholder="V" maxLength={3} className={fieldClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Color fondo</label>
                  <div className="flex gap-2">
                    <Input type="text" value={form.bg_color} onChange={(e) => updateForm('bg_color', e.target.value)} placeholder="bg-green-600" className={`flex-1 ${fieldClassName}`} />
                    <span className={`h-8 w-8 rounded-full ${form.bg_color}`} />
                  </div>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Color texto</label>
                  <Input type="text" value={form.text_color} onChange={(e) => updateForm('text_color', e.target.value)} placeholder="text-white" className={fieldClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">DB Areas</label>
                  <Input type="text" value={form.db_areas} onChange={(e) => updateForm('db_areas', e.target.value)} placeholder="virologia, bacteriologia" className={fieldClassName} />
                  <p className="mt-1 text-xs text-muted-foreground">Separadas por coma. Ej: nematologia, fitopatologia.</p>
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Template Env Var</label>
                  <Input type="text" value={form.template_env_var} onChange={(e) => updateForm('template_env_var', e.target.value)} placeholder="PDFMONKEY_TEMPLATE_VIROLOGY" className={fieldClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">PDFMonkey Template ID</label>
                  <Input type="text" value={form.pdfmonkey_template_id} onChange={(e) => updateForm('pdfmonkey_template_id', e.target.value)} placeholder="00000000-0000-0000-0000-000000000000" className={fieldClassName} />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Título informe</label>
                  <Input type="text" value={form.titulo_informe} onChange={(e) => updateForm('titulo_informe', e.target.value)} placeholder="INFORME VIROLOGICO" className={fieldClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripción tipo análisis</label>
                  <textarea value={form.tipo_analisis_descripcion} onChange={(e) => updateForm('tipo_analisis_descripcion', e.target.value)} rows={2} className={textareaClassName} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700">Descripción metodología</label>
                  <textarea value={form.metodologia_descripcion} onChange={(e) => updateForm('metodologia_descripcion', e.target.value)} rows={3} className={textareaClassName} />
                </div>
              </div>

              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={closeForm}>Cancelar</Button>
                <Button type="button" onClick={handleSave} disabled={saving || !form.key || !form.label} className="gap-2">
                  {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  {editingId ? 'Guardar cambios' : 'Crear tipo'}
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <Microscope className="h-4 w-4 text-green-700" />
                  Tipos registrados
                </CardTitle>
                <CardDescription>
                  {filteredTypes.length > 0 ? 'Lista de tipos de análisis' : 'Sin resultados'}
                </CardDescription>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {types.length} tipo{types.length !== 1 ? 's' : ''}
              </p>
            </div>
          </CardHeader>

          {filteredTypes.length === 0 && !isLoading ? (
            <CardContent className="py-12 text-center text-muted-foreground">
              {searchQuery ? 'Sin resultados para esta búsqueda.' : 'No hay tipos de análisis registrados.'}
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Key</TableHead>
                    <TableHead className="hidden md:table-cell">DB Areas</TableHead>
                    <TableHead className="hidden lg:table-cell">Template</TableHead>
                    <TableHead>Activo</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredTypes.map((t) => (
                    <TableRow key={t.id} className={!t.active ? 'opacity-50' : undefined}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full text-sm font-bold ${t.bg_color} ${t.text_color}`}>
                            {t.initial}
                          </span>
                          <span className="font-medium text-foreground">{t.label}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="rounded bg-muted px-2 py-1 text-xs">{t.key}</code>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        <div className="flex flex-wrap gap-1">
                          {(t.db_areas || []).map((area) => (
                            <Badge key={area} variant="outline" className="font-normal">
                              {area}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {t.template_env_var ? (
                          <code className="rounded bg-muted px-2 py-1 text-xs">{t.template_env_var}</code>
                        ) : (
                          <span className="text-xs text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {t.active ? (
                          <Badge variant="outline" className="border-green-200 bg-green-50 font-normal text-green-800">Activo</Badge>
                        ) : (
                          <Badge variant="outline" className="border-red-200 bg-red-50 font-normal text-red-800">Inactivo</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <div className="inline-flex items-center justify-end gap-1">
                          <Button type="button" variant="ghost" size="icon-sm" onClick={() => openEdit(t)} title="Editar">
                            <Edit className="h-4 w-4" />
                          </Button>
                          {t.active ? (
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDeactivate(t)} title="Desactivar" className="text-destructive hover:text-destructive">
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : (
                            <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleReactivate(t)} title="Reactivar">
                              <RefreshCw className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )

}
