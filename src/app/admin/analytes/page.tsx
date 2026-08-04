'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { TestTube, Loader2, Plus, Edit, Trash2, X, Check, Search } from 'lucide-react'
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
import { fieldClassName } from '@/components/ui/form-field-styles'
import { cn } from '@/lib/utils'

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
  virus: 'border-sky-200 bg-sky-50 text-sky-800',
  hongo: 'border-amber-200 bg-amber-50 text-amber-800',
  nematodo: 'border-teal-200 bg-teal-50 text-teal-800',
  bacteria: 'border-rose-200 bg-rose-50 text-rose-800',
  abiotico: 'border-gray-200 bg-gray-50 text-gray-700',
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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Analitos</h1>
            <p className="text-sm text-muted-foreground">
              Gestiona los analitos (virus, hongos, nematodos, bacterias, abióticos) disponibles en el sistema.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => {
              setIsCreating(true)
              setNewScientificName('')
              setNewType('virus')
            }}
            className="gap-2"
          >
            <Plus className="h-4 w-4" />
            Agregar analito
          </Button>
        </div>

        {error ? (
          <div className="flex items-center justify-between rounded-lg border border-red-200 bg-red-50 p-3">
            <p className="text-sm text-red-700">{error}</p>
            <Button type="button" variant="ghost" size="icon-sm" onClick={() => setError(null)}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : null}

        {successMsg ? (
          <div className="rounded-lg border border-green-200 bg-green-50 p-3">
            <p className="text-sm text-green-700">{successMsg}</p>
          </div>
        ) : null}

        <Card>
          <CardContent className="p-4">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por nombre, código o tipo..."
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {isCreating ? (
          <Card>
            <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
              <select
                value={newType}
                onChange={(e) => setNewType(e.target.value)}
                className={`${fieldClassName} sm:w-40`}
              >
                {VALID_TYPES.map((t) => (
                  <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                ))}
              </select>
              <Input
                type="text"
                value={newScientificName}
                onChange={(e) => setNewScientificName(e.target.value)}
                placeholder="Nombre científico..."
                className="flex-1"
                autoFocus
                onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              />
              <div className="flex items-center gap-1">
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  onClick={handleCreate}
                  disabled={isSaving || !newScientificName.trim()}
                >
                  <Check className="h-4 w-4" />
                </Button>
                <Button type="button" variant="ghost" size="icon-sm" onClick={() => setIsCreating(false)}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-base">
                  <TestTube className="h-4 w-4 text-green-700" />
                  Catálogo de analitos
                </CardTitle>
                <CardDescription>
                  {filteredAnalytes.length > 0 ? 'Edita o elimina desde la fila' : 'Sin resultados'}
                </CardDescription>
              </div>
              <p className="text-xs font-medium text-muted-foreground">
                {filteredAnalytes.length} de {analytes.length}
              </p>
            </div>
          </CardHeader>

          {isLoading ? (
            <CardContent className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-48">Código</TableHead>
                    <TableHead>Nombre científico</TableHead>
                    <TableHead className="w-32">Tipo</TableHead>
                    <TableHead className="w-24 text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredAnalytes.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-12 text-center text-muted-foreground">
                        {searchQuery ? 'Sin resultados para la búsqueda' : 'No hay analitos registrados'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredAnalytes.map((analyte) => (
                      <TableRow key={analyte.id} className="hover:bg-accent/40">
                        <TableCell>
                          <span className="font-mono text-sm text-muted-foreground">
                            {analyte.code || '—'}
                          </span>
                        </TableCell>
                        <TableCell>
                          {editingId === analyte.id ? (
                            <Input
                              type="text"
                              value={editScientificName}
                              onChange={(e) => setEditScientificName(e.target.value)}
                              className="h-8"
                              autoFocus
                            />
                          ) : (
                            <span className="text-sm text-foreground">{analyte.scientific_name}</span>
                          )}
                        </TableCell>
                        <TableCell>
                          {editingId === analyte.id ? (
                            <select
                              value={editType}
                              onChange={(e) => setEditType(e.target.value)}
                              className={`${fieldClassName} h-8`}
                            >
                              {VALID_TYPES.map((t) => (
                                <option key={t} value={t}>{TYPE_LABELS[t]}</option>
                              ))}
                            </select>
                          ) : (
                            <Badge
                              variant="outline"
                              className={cn('font-normal', TYPE_BADGE[analyte.type] || 'border-gray-200 bg-gray-50 text-gray-700')}
                            >
                              {TYPE_LABELS[analyte.type] || analyte.type}
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {editingId === analyte.id ? (
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleSaveEdit(analyte.id)} disabled={isSaving}>
                                <Check className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon-sm" onClick={() => setEditingId(null)}>
                                <X className="h-4 w-4" />
                              </Button>
                            </div>
                          ) : (
                            <div className="inline-flex items-center justify-end gap-1">
                              <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleStartEdit(analyte)} disabled={isSaving || editingId !== null} title="Editar">
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button type="button" variant="ghost" size="icon-sm" onClick={() => handleDelete(analyte.id)} disabled={isSaving} title="Eliminar" className="text-destructive hover:text-destructive">
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          )}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )

}
