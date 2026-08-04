'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getAllAreaFilterOptions } from '@/config/analysisTypes'
import {
  BulkRowSelectionCheckbox,
  BulkSelectAllHeaderCheckbox,
  BulkSelectionToolbarRow,
} from '@/components/BulkSelectionTableToolbar'
import ViewResultModal from '@/components/results/ViewResultModal'
import AddResultModal from '@/components/results/AddResultModal'
import DeleteResultConfirmModal from '@/components/results/DeleteResultConfirmModal'
import { ResultWithRelations } from '@/types/database'
import { formatDate } from '@/lib/utils/formatters'
import { getResultStatusBadge, getResultTypeBadge } from '@/lib/utils/badges'
import { 
  Plus,
  Search,
  FlaskConical,
  Loader2,
  Eye,
  Edit2,
  Filter,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

const filterSelectClassName =
  'h-8 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20'

export default function ResultsPage() {
  const { userRole } = useAuth()
  const [results, setResults] = useState<ResultWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [testAreaFilter, setTestAreaFilter] = useState<string>('all')
  const [pageSize, setPageSize] = useState<20 | 50 | 100>(20)
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingResultId, setEditingResultId] = useState<string | null>(null)
  const [resultPendingDelete, setResultPendingDelete] = useState<ResultWithRelations | null>(null)
  const [isDeletingResult, setIsDeletingResult] = useState(false)
  const [deleteResultError, setDeleteResultError] = useState<string | null>(null)
  const [selectedResults, setSelectedResults] = useState<Set<string>>(new Set())
  const [isBulkValidating, setIsBulkValidating] = useState(false)
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)

  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams({ limit: String(pageSize) })
      const response = await fetch(`/api/results?${params}`)
      if (!response.ok) throw new Error('Failed to fetch results')
      
      const data = await response.json()
      // Handle both formats: {data: [...]} or direct array
      const resultsArray = Array.isArray(data) ? data : (data.data || [])
      setResults(resultsArray)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [pageSize])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.samples?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.pathogen_identified?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || result.status === statusFilter
    const matchesTestArea = testAreaFilter === 'all' || result.test_area === testAreaFilter

    return matchesSearch && matchesStatus && matchesTestArea
  })

  // Badge functions moved to shared utilities

  const canCreateResults = userRole && ['admin', 'validador', 'comun'].includes(userRole)
  const canEditResults = userRole && ['admin', 'validador'].includes(userRole)
  const canDeleteResults = canEditResults
  const canUseResultBulkActions = canEditResults

  const handleSelectResult = (resultId: string) => {
    setSelectedResults((previousSelection) => {
      const nextSelection = new Set(previousSelection)
      if (nextSelection.has(resultId)) {
        nextSelection.delete(resultId)
      } else {
        nextSelection.add(resultId)
      }
      return nextSelection
    })
  }

  const handleSelectAllFilteredResults = () => {
    if (selectedResults.size === filteredResults.length) {
      setSelectedResults(new Set())
    } else {
      setSelectedResults(new Set(filteredResults.map((resultRow) => resultRow.id)))
    }
  }

  const clearResultSelection = () => {
    setSelectedResults(new Set())
  }

  const handleBulkValidateResults = async () => {
    const selectedIds = Array.from(selectedResults)
    const selectedRows = results.filter((row) => selectedIds.includes(row.id))
    const alreadyValidated = selectedRows.filter((row) => row.status === 'validated')
    if (alreadyValidated.length > 0) {
      alert(
        `${alreadyValidated.length} resultado(s) ya están validados. Se omitirán.`
      )
    }
    const validatableRows = selectedRows.filter((row) => row.status !== 'validated')
    if (validatableRows.length === 0) {
      alert('No hay resultados que se puedan validar.')
      return
    }
    if (
      !confirm(
        `¿Estás seguro de que quieres validar ${validatableRows.length} resultado(s)?`
      )
    ) {
      return
    }

    setIsBulkValidating(true)
    let successCount = 0
    let errorCount = 0
    for (const resultRow of validatableRows) {
      try {
        const validationResponse = await fetch(`/api/results/${resultRow.id}/validate`, {
          method: 'PATCH',
        })
        if (validationResponse.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }
    setIsBulkValidating(false)
    clearResultSelection()
    await fetchResults()
    if (errorCount > 0) {
      alert(
        `Se validaron ${successCount} resultado(s). ${errorCount} resultado(s) no se pudieron validar.`
      )
    } else {
      alert(`Se validaron ${successCount} resultado(s) exitosamente.`)
    }
  }

  const handleBulkDeleteResults = async () => {
    const selectedIds = Array.from(selectedResults)
    const selectedRows = results.filter((row) => selectedIds.includes(row.id))
    const validatedRows = selectedRows.filter((row) => row.status === 'validated')
    if (validatedRows.length > 0) {
      alert(
        `No se pueden eliminar ${validatedRows.length} resultado(s) porque están validados. Se omitirán.`
      )
    }
    const deletableRows = selectedRows.filter((row) => row.status !== 'validated')
    if (deletableRows.length === 0) {
      alert('No hay resultados que se puedan eliminar.')
      return
    }
    if (
      !confirm(
        `¿Estás seguro de que quieres eliminar ${deletableRows.length} resultado(s)? Esta acción no se puede deshacer.`
      )
    ) {
      return
    }

    setIsBulkDeleting(true)
    let successCount = 0
    let errorCount = 0
    for (const resultRow of deletableRows) {
      try {
        const deleteResponse = await fetch(`/api/results/${resultRow.id}`, {
          method: 'DELETE',
        })
        if (deleteResponse.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }
    setIsBulkDeleting(false)
    clearResultSelection()
    await fetchResults()
    if (errorCount > 0) {
      alert(
        `Se eliminaron ${successCount} resultado(s). ${errorCount} resultado(s) no se pudieron eliminar.`
      )
    } else {
      alert(`Se eliminaron ${successCount} resultado(s) exitosamente.`)
    }
  }

  const mapDeleteResultError = (apiMessage: string) => {
    if (apiMessage === 'Cannot delete validated results') {
      return 'No se pueden eliminar resultados validados.'
    }
    return apiMessage
  }

  const handleConfirmDeleteResult = async () => {
    if (!resultPendingDelete) return
    setIsDeletingResult(true)
    setDeleteResultError(null)
    try {
      const response = await fetch(`/api/results/${resultPendingDelete.id}`, { method: 'DELETE' })
      const payload = await response.json().catch(() => ({}))
      if (!response.ok) {
        const message =
          typeof payload.error === 'string' ? mapDeleteResultError(payload.error) : 'No se pudo eliminar el resultado.'
        setDeleteResultError(message)
        return
      }
      setResultPendingDelete(null)
      await fetchResults()
    } catch {
      setDeleteResultError('Error de red al eliminar. Intenta de nuevo.')
    } finally {
      setIsDeletingResult(false)
    }
  }

  const testAreas = getAllAreaFilterOptions()

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Resultados
            </h1>
            <p className="text-sm text-muted-foreground">
              Gestión de resultados de análisis de laboratorio
            </p>
          </div>
          {canCreateResults && (
            <Button type="button" onClick={() => setShowCreateModal(true)} className="gap-2">
              <Plus className="h-4 w-4" />
              Nuevo Resultado
            </Button>
          )}
        </div>

        <Card>
          <CardContent className="grid grid-cols-1 gap-4 p-4 sm:grid-cols-2 lg:grid-cols-5">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por muestra, patógeno o diagnóstico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className={filterSelectClassName}
            >
              <option value="all">Todos los estados</option>
              <option value="pending">Pendiente</option>
              <option value="completed">Completado</option>
              <option value="validated">Validado</option>
            </select>
            <select
              value={testAreaFilter}
              onChange={(e) => setTestAreaFilter(e.target.value)}
              className={filterSelectClassName}
            >
              <option value="all">Todas las áreas</option>
              {testAreas.map((area) => (
                <option key={area.value} value={area.value}>
                  {area.label}
                </option>
              ))}
            </select>
            <div>
              <label htmlFor="page-size" className="sr-only">
                Resultados por página
              </label>
              <select
                id="page-size"
                value={pageSize}
                onChange={(e) => setPageSize(Number(e.target.value) as 20 | 50 | 100)}
                className={filterSelectClassName}
              >
                <option value={20}>Mostrar 20</option>
                <option value={50}>Mostrar 50</option>
                <option value={100}>Mostrar 100</option>
              </select>
            </div>
            <div className="flex items-center text-sm text-muted-foreground">
              <Filter className="mr-2 h-4 w-4" />
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
            </div>
          </CardContent>
        </Card>

        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <span className="ml-2 text-muted-foreground">Cargando resultados...</span>
          </div>
        ) : (
          <Card className="overflow-hidden">
            {filteredResults.length > 0 && (
              <CardHeader className="border-b border-gray-100 py-3">
                <CardDescription>
                  Gestión y validación de resultados de análisis
                </CardDescription>
              </CardHeader>
            )}
            {filteredResults.length === 0 ? (
              <CardContent className="flex flex-col items-center py-12 text-center">
                <FlaskConical className="mb-4 h-10 w-10 text-muted-foreground" />
                <CardTitle className="mb-2 text-lg">Sin resultados</CardTitle>
                <CardDescription>
                  {searchTerm || statusFilter !== 'all' || testAreaFilter !== 'all'
                    ? 'No se encontraron resultados que coincidan con los filtros.'
                    : 'Aún no hay resultados registrados.'}
                </CardDescription>
                {canCreateResults &&
                  !searchTerm &&
                  statusFilter === 'all' &&
                  testAreaFilter === 'all' && (
                    <Button
                      type="button"
                      onClick={() => setShowCreateModal(true)}
                      className="mt-6 gap-2"
                    >
                      <Plus className="h-4 w-4" />
                      Crear primer resultado
                    </Button>
                  )}
              </CardContent>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <BulkSelectionToolbarRow
                      columnSpan={8}
                      selectedCount={selectedResults.size}
                      filteredRowCount={filteredResults.length}
                      selectionSummaryText={`${selectedResults.size} resultado(s) seleccionado(s)`}
                      onSelectAll={handleSelectAllFilteredResults}
                      onClearSelection={clearResultSelection}
                      validateAction={
                        canUseResultBulkActions
                          ? {
                              onClick: handleBulkValidateResults,
                              disabled: isBulkValidating,
                              isLoading: isBulkValidating,
                            }
                          : null
                      }
                      deleteAction={
                        canDeleteResults
                          ? {
                              onClick: handleBulkDeleteResults,
                              disabled: isBulkDeleting,
                              isLoading: isBulkDeleting,
                            }
                          : null
                      }
                    />
                    {selectedResults.size === 0 ? (
                      <TableRow>
                        {canUseResultBulkActions && (
                          <BulkSelectAllHeaderCheckbox
                            checked={
                              selectedResults.size === filteredResults.length &&
                              filteredResults.length > 0
                            }
                            onChange={handleSelectAllFilteredResults}
                          />
                        )}
                        <TableHead className="min-w-[150px]">Muestra</TableHead>
                        <TableHead className="min-w-[120px]">Área de Análisis</TableHead>
                        <TableHead className="hidden md:table-cell">Estado</TableHead>
                        <TableHead className="hidden lg:table-cell">Resultado</TableHead>
                        <TableHead className="min-w-[120px]">Patógeno</TableHead>
                        <TableHead className="hidden whitespace-nowrap lg:table-cell">
                          Fecha
                        </TableHead>
                        <TableHead className="sticky right-0 z-10 w-32 bg-card">
                          Acciones
                        </TableHead>
                      </TableRow>
                    ) : null}
                  </TableHeader>
                  <TableBody>
                    {filteredResults.map((result) => (
                      <TableRow key={result.id} className="group">
                        {canUseResultBulkActions && (
                          <BulkRowSelectionCheckbox
                            checked={selectedResults.has(result.id)}
                            onChange={() => handleSelectResult(result.id)}
                          />
                        )}
                        <TableCell>
                          <div className="flex min-w-0 items-center">
                            <FlaskConical className="mr-2 h-5 w-5 shrink-0 text-green-600" />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-foreground">
                                {result.samples?.code || 'N/A'}
                              </div>
                              <div className="truncate text-xs text-muted-foreground">
                                {result.samples?.clients?.name || 'Cliente no disponible'}
                              </div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="capitalize text-foreground">
                            {result.test_area?.replace('_', ' ') || 'N/A'}
                          </span>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {getResultStatusBadge(result.status)}
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          {getResultTypeBadge(result.result_type)}
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0 truncate text-foreground">
                            {result.pathogen_identified || 'No identificado'}
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                          {formatDate(result.performed_at)}
                        </TableCell>
                        <TableCell className="sticky right-0 z-10 bg-card">
                          <div className="flex items-center gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => {
                                setSelectedResultId(result.id)
                                setShowViewModal(true)
                              }}
                              title="Ver detalles"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {canEditResults && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setEditingResultId(result.id)
                                  setShowCreateModal(true)
                                }}
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            )}
                            {canDeleteResults && result.status !== 'validated' && (
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => {
                                  setDeleteResultError(null)
                                  setResultPendingDelete(result)
                                }}
                                title="Eliminar resultado"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
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
        )}
      </div>

      {/* Modals */}
      <ViewResultModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedResultId(null)
        }}
        resultId={selectedResultId}
      />

      <AddResultModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingResultId(null)
        }}
        onSuccess={() => {
          fetchResults()
          setShowCreateModal(false)
          setEditingResultId(null)
        }}
        resultId={editingResultId}
      />

      <DeleteResultConfirmModal
        isOpen={!!resultPendingDelete}
        onClose={() => {
          if (!isDeletingResult) {
            setResultPendingDelete(null)
            setDeleteResultError(null)
          }
        }}
        onConfirm={handleConfirmDeleteResult}
        sampleCode={resultPendingDelete?.samples?.code || '—'}
        testAreaLabel={resultPendingDelete?.test_area ?? null}
        isDeleting={isDeletingResult}
        errorMessage={deleteResultError}
      />
    </DashboardLayout>
  )
}