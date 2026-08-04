'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  BulkRowSelectionCheckbox,
  BulkSelectAllHeaderCheckbox,
  BulkSelectionToolbarRow,
} from '@/components/BulkSelectionTableToolbar'
import CreateReportModal from '@/components/reports/CreateReportModal'
import ViewReportModal from '@/components/reports/ViewReportModal'
import FeedbackModal from '@/components/reports/FeedbackModal'
import SamplesDisplay from '@/components/reports/SamplesDisplay'
import { getAnalysisTypeIndicator } from '@/config/analysisTypes'
import {
  FileText,
  Download,
  Send,
  Search,
  Filter,
  Loader2,
  Eye,
  Edit,
  Plus,
  Trash2,
  Save,
  X,
  Check,
  MessageCircle,
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
import { cn } from '@/lib/utils'

interface Report {
  id: string
  status: string
  completed?: boolean | null
  responsible_id?: string | null
  created_at: string
  template: string
  download_url?: string
  payment?: boolean | null
  invoice_number?: string | null
  test_areas?: string[] | null
  clients: {
    id: string
    name: string
    rut: string
  }
  results: Array<{
    id: string
    samples: {
      code: string
      species: string
      variety?: string
    }
  }>
}

const filterSelectClassName =
  'h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20 sm:w-48'

export default function ReportsPage() {
  const { userRole, isLoading: authLoading, user, isAuthenticated, linkedClientIds } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isFeedbackModalOpen, setIsFeedbackModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [viewReportId, setViewReportId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{[key: string]: { payment: boolean, invoice_number: string }}>({})
  const [savingPayment, setSavingPayment] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [selectedReports, setSelectedReports] = useState<Set<string>>(new Set())
  const [isBulkDeleting, setIsBulkDeleting] = useState(false)
  const [isBulkValidating, setIsBulkValidating] = useState(false)
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientTabs, setClientTabs] = useState<{ id: string; name: string }[]>([])
  const hasFetchedRef = useRef<string | false>(false)

  const supabase = getSupabaseClient()

  // Cargar nombres de clientes para las pestañas
  useEffect(() => {
    if (linkedClientIds.length > 0) {
      supabase
        .from('clients')
        .select('id, name')
        .in('id', linkedClientIds)
        .then(({ data }) => {
          if (data) {
            setClientTabs(data)
            if (!selectedClientId || !linkedClientIds.includes(selectedClientId)) {
              setSelectedClientId(data[0]?.id || null)
            }
          }
        })
    } else {
      setClientTabs([])
      setSelectedClientId(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedClientIds.join(',')])

  const fetchReports = useCallback(async () => {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          clients!inner (
            id,
            name,
            rut
          ),
          results (
            id,
            samples (
              code,
              species,
              variety
            )
          )
        `)
        .order('created_at', { ascending: false })

      // Si el usuario es consumidor, filtrar por el cliente seleccionado
      if (userRole === 'consumidor') {
        if (selectedClientId) {
          query = query.eq('client_id', selectedClientId)
          query = query.eq('completed', true)
        } else {
          // Sin cliente seleccionado no debe ver ningun informe
          query = query.eq('client_id', '00000000-0000-0000-0000-000000000000')
        }
      }

      if (statusFilter !== 'all') {
        if (statusFilter === 'validated') {
          // Para validados, filtramos por completed = true
          query = query.eq('completed', true)
        } else {
          query = query.eq('status', statusFilter)
        }
      }
      const { data, error } = await query

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
      // Set empty array to avoid infinite loading
      setReports([])
    } finally {
      // Always resolve loading state, even on error
      setIsLoading(false)
    }
  }, [statusFilter, supabase, userRole, selectedClientId])

  useEffect(() => {
    // No ejecutar si no hay usuario autenticado o si aún está cargando
    // Esto previene loops infinitos cuando la sesión expira
    if (authLoading || !user || !isAuthenticated) {
      // Si la sesión expiró, resolver el estado de loading para evitar loops
      if (!authLoading && (!user || !isAuthenticated)) {
        setIsLoading(false)
        hasFetchedRef.current = false // Reset cuando la sesión expira
      }
      return
    }

    // Para consumidores con clientes vinculados: esperar a que selectedClientId este listo
    // Evita que se ejecute una query sin filtro por la race condition con el useEffect de clientes
    if (userRole === 'consumidor' && linkedClientIds.length > 0 && !selectedClientId) {
      return
    }

    // Crear una clave unica basada en las dependencias reales
    const fetchKey = `${statusFilter}-${userRole}-${selectedClientId || 'none'}`
    
    // Solo ejecutar si las dependencias reales cambiaron
    if (hasFetchedRef.current !== fetchKey) {
      hasFetchedRef.current = fetchKey
      fetchReports()
    }
    
    // Timeout de seguridad: resolver estado después de 10 segundos si aún está cargando
    const timeoutId = setTimeout(() => {
      setIsLoading(false)
    }, 10000)

    return () => clearTimeout(timeoutId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, user, isAuthenticated, statusFilter, userRole, selectedClientId, linkedClientIds])

  const handleEditPayment = (reportId: string, currentPayment?: boolean, currentInvoice?: string) => {
    setEditingPayment(reportId)
    setPaymentData(prev => ({
      ...prev,
      [reportId]: {
        payment: currentPayment || false,
        invoice_number: currentInvoice || ''
      }
    }))
  }

  const handleSavePayment = async (reportId: string) => {
    setSavingPayment(reportId)
    try {
      const data = paymentData[reportId]
      const response = await fetch(`/api/reports/payment/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment: data.payment,
          invoice_number: data.invoice_number || null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to update payment information')
      }

      // Update the report in the local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, payment: data.payment, invoice_number: data.invoice_number || null }
          : report
      ))
      
      setEditingPayment(null)
      delete paymentData[reportId]
      setPaymentData({ ...paymentData })
    } catch (err) {
      console.error('Error updating payment information:', err)
      alert('Error al actualizar la información de pago. Por favor, intente nuevamente.')
    } finally {
      setSavingPayment(null)
    }
  }

  const handleClearPayment = async (reportId: string) => {
    setSavingPayment(reportId)
    try {
      const response = await fetch(`/api/reports/payment/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          payment: false,
          invoice_number: null
        })
      })

      if (!response.ok) {
        throw new Error('Failed to clear payment information')
      }

      // Update the report in the local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, payment: false, invoice_number: null }
          : report
      ))
      
      setEditingPayment(null)
    } catch (err) {
      console.error('Error clearing payment information:', err)
      alert('Error al limpiar la información de pago. Por favor, intente nuevamente.')
    } finally {
      setSavingPayment(null)
    }
  }

  const handleCancelEdit = (reportId: string) => {
    setEditingPayment(null)
    const updatedData = { ...paymentData }
    delete updatedData[reportId]
    setPaymentData(updatedData)
  }

  const handleValidateReport = async (reportId: string) => {
    setUpdatingStatus(reportId)
    try {
      const response = await fetch(`/api/reports/status/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'validated' })
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('Error response:', responseData)
        throw new Error(responseData.error || 'Error al validar el informe')
      }

      // Update the report in the local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, completed: true, responsible_id: user?.id || null }
          : report
      ))
    } catch (error) {
      console.error('Error validating report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al validar el informe. Por favor, intente nuevamente.'
      alert(errorMessage)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleUnvalidateReport = async (reportId: string) => {
    setUpdatingStatus(reportId)
    try {
      const response = await fetch(`/api/reports/status/${reportId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'draft' })
      })

      const responseData = await response.json()

      if (!response.ok) {
        console.error('Error response:', responseData)
        throw new Error(responseData.error || 'Error al cambiar el informe a borrador')
      }

      // Update the report in the local state
      setReports(prev => prev.map(report => 
        report.id === reportId 
          ? { ...report, completed: false, responsible_id: null }
          : report
      ))
    } catch (error) {
      console.error('Error unvalidating report:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error al cambiar el informe a borrador. Por favor, intente nuevamente.'
      alert(errorMessage)
    } finally {
      setUpdatingStatus(null)
    }
  }

  const handleDeleteReport = async (reportId: string, reportStatus: string) => {
    if (reportStatus === 'sent') {
      alert('No se pueden eliminar informes enviados')
      return
    }

    if (!confirm('¿Estás seguro de que quieres eliminar este informe? Esta acción no se puede deshacer.')) {
      return
    }

    setIsDeleting(reportId)
    try {
      const response = await fetch(`/api/reports/delete/${reportId}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Error al eliminar el informe')
      }

      await fetchReports()
    } catch (error) {
      console.error('Error deleting report:', error)
      alert('Error al eliminar el informe. Por favor, intente nuevamente.')
    } finally {
      setIsDeleting(null)
    }
  }

  // Funciones de selección múltiple
  const handleSelectReport = (reportId: string) => {
    setSelectedReports(prev => {
      const newSet = new Set(prev)
      if (newSet.has(reportId)) {
        newSet.delete(reportId)
      } else {
        newSet.add(reportId)
      }
      return newSet
    })
  }

  const handleSelectAll = () => {
    if (selectedReports.size === filteredReports.length) {
      setSelectedReports(new Set())
    } else {
      setSelectedReports(new Set(filteredReports.map(r => r.id)))
    }
  }

  const clearSelection = () => {
    setSelectedReports(new Set())
  }

  // Acciones masivas
  const handleBulkDelete = async () => {
    const selectedArray = Array.from(selectedReports)
    const selectedReportsList = reports.filter(r => selectedArray.includes(r.id))
    
    // Verificar si hay informes enviados
    const sentReports = selectedReportsList.filter(r => r.status === 'sent')
    if (sentReports.length > 0) {
      alert(`No se pueden eliminar ${sentReports.length} informe(s) porque están enviados. Se omitirán.`)
    }

    const deletableReports = selectedReportsList.filter(r => r.status !== 'sent')
    if (deletableReports.length === 0) {
      alert('No hay informes que se puedan eliminar.')
      return
    }

    if (!confirm(`¿Estás seguro de que quieres eliminar ${deletableReports.length} informe(s)? Esta acción no se puede deshacer.`)) {
      return
    }

    setIsBulkDeleting(true)
    let successCount = 0
    let errorCount = 0

    for (const report of deletableReports) {
      try {
        const response = await fetch(`/api/reports/delete/${report.id}`, {
          method: 'DELETE',
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }

    setIsBulkDeleting(false)
    clearSelection()
    await fetchReports()

    if (errorCount > 0) {
      alert(`Se eliminaron ${successCount} informe(s). ${errorCount} informe(s) no se pudieron eliminar.`)
    } else {
      alert(`Se eliminaron ${successCount} informe(s) exitosamente.`)
    }
  }

  const handleBulkValidate = async () => {
    const selectedArray = Array.from(selectedReports)
    const selectedReportsList = reports.filter(r => selectedArray.includes(r.id))
    
    // Verificar si hay informes ya validados
    const alreadyValidated = selectedReportsList.filter(r => r.completed === true)
    if (alreadyValidated.length > 0) {
      alert(`${alreadyValidated.length} informe(s) ya están validados. Se omitirán.`)
    }

    const validatableReports = selectedReportsList.filter(r => r.completed !== true)
    if (validatableReports.length === 0) {
      alert('No hay informes que se puedan validar.')
      return
    }

    if (!confirm(`¿Estás seguro de que quieres validar ${validatableReports.length} informe(s)?`)) {
      return
    }

    setIsBulkValidating(true)
    let successCount = 0
    let errorCount = 0

    for (const report of validatableReports) {
      try {
        const response = await fetch(`/api/reports/status/${report.id}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ status: 'validated' })
        })

        if (response.ok) {
          successCount++
        } else {
          errorCount++
        }
      } catch {
        errorCount++
      }
    }

    setIsBulkValidating(false)
    clearSelection()
    await fetchReports()

    if (errorCount > 0) {
      alert(`Se validaron ${successCount} informe(s). ${errorCount} informe(s) no se pudieron validar.`)
    } else {
      alert(`Se validaron ${successCount} informe(s) exitosamente.`)
    }
  }


  const filteredReports = reports.filter((report) => {
    if (searchTerm === '') return true
    
    const searchLower = searchTerm.toLowerCase()
    const clientName = report.clients?.name?.toLowerCase() || ''
    const clientRut = report.clients?.rut?.toLowerCase() || ''
    const sampleCodes = report.results?.map((r) => r.samples?.code?.toLowerCase() || '').join(' ') || ''
    
    return clientName.includes(searchLower) || 
           clientRut.includes(searchLower) || 
           sampleCodes.includes(searchLower)
  })

  const getStatusBadge = (status: string | null, reportId: string, completed?: boolean | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center rounded-full border border-gray-200 bg-gray-100 px-2.5 py-0.5 text-xs font-medium text-gray-800">
          Sin estado
        </span>
      )
    }
    
    const statusConfig = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      generated: 'bg-blue-100 text-blue-800 border-blue-200',
      sent: 'bg-green-100 text-green-800 border-green-200',
      validated: 'bg-purple-100 text-purple-800 border-purple-200'
    }

    const statusLabels = {
      draft: 'Borrador',
      generated: 'Generado',
      sent: 'Enviado',
      validated: 'Validado'
    }

    // Verificar si el usuario tiene permisos para validar (admin o validador)
    const canValidate = userRole === 'admin' || userRole === 'validador'
    
    // Si completed es true, el informe está validado (usamos completed en lugar de status)
    const isValidated = completed === true

    // Si es borrador (no validado), mostrar X a la izquierda (no clickeable) y check a la derecha (clickeable para validar)
    if (status === 'draft' && !isValidated) {
      const isUpdating = updatingStatus === reportId
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800 border-gray-200'
        }`}>
          <X className="h-3 w-3 text-gray-500" />
          {statusLabels[status as keyof typeof statusLabels] || status}
          {canValidate ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleValidateReport(reportId)
              }}
              disabled={isUpdating}
              className="rounded p-0.5 transition-colors hover:bg-gray-200 disabled:cursor-not-allowed disabled:opacity-50"
              title="Validar informe"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <Check className="h-3 w-3 text-green-600 hover:text-green-700" />
              )}
            </button>
          ) : (
            <Check className="h-3 w-3 text-gray-400" />
          )}
        </span>
      )
    }

    // Si es validado (completed = true), mostrar X clickeable a la izquierda (para desvalidar) y check a la derecha (no clickeable)
    if (isValidated) {
      const isUpdating = updatingStatus === reportId
      return (
        <span className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-medium ${
          statusConfig.validated || 'bg-purple-100 text-purple-800 border-purple-200'
        }`}>
          {canValidate ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUnvalidateReport(reportId)
              }}
              disabled={isUpdating}
              className="rounded p-0.5 transition-colors hover:bg-purple-200 disabled:cursor-not-allowed disabled:opacity-50"
              title="Cambiar a borrador"
            >
              {isUpdating ? (
                <Loader2 className="h-3 w-3 animate-spin" />
              ) : (
                <X className="h-3 w-3 text-red-600 hover:text-red-700" />
              )}
            </button>
          ) : (
            <X className="h-3 w-3 text-gray-400" />
          )}
          {statusLabels.validated}
          <Check className="h-3 w-3 text-green-600" />
        </span>
      )
    }

    return (
      <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${
        statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800 border-gray-200'
      }`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  const getTemplateBadge = (template: string | null) => {
    if (!template) return null

    const templateConfig = {
      standard: 'bg-blue-100 text-blue-800',
      regulatory: 'bg-purple-100 text-purple-800',
      summary: 'bg-green-100 text-green-800',
      detailed: 'bg-orange-100 text-orange-800'
    }

    const templateLabels = {
      standard: 'Estándar',
      regulatory: 'Regulatorio',
      summary: 'Resumen',
      detailed: 'Detallado'
    }

    return (
      <span className={`inline-flex items-center rounded px-2 py-1 text-xs font-medium ${
        templateConfig[template as keyof typeof templateConfig] || 'bg-gray-100 text-gray-800'
      }`}>
        {templateLabels[template as keyof typeof templateLabels] || template}
      </span>
    )
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
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
              Informes
            </h1>
            <p className="text-sm text-muted-foreground">
              {userRole === 'consumidor'
                ? 'Informes de análisis de tus muestras'
                : 'Gestiona y genera informes de análisis'}
            </p>
            {userRole === 'consumidor' && linkedClientIds.length > 0 && (
              <p className="mt-1 text-sm text-green-700">
                Mostrando solo informes validados vinculados a tu cuenta
              </p>
            )}
          </div>
          {userRole === 'consumidor' && (
            <Button
              type="button"
              onClick={() => setIsFeedbackModalOpen(true)}
              className="gap-2"
            >
              <MessageCircle className="h-4 w-4" />
              Ayuda
            </Button>
          )}
          {(userRole === 'admin' || userRole === 'comun') && (
            <div className="flex flex-wrap gap-2">
              <Button type="button" variant="outline" className="gap-2">
                <Filter className="h-4 w-4" />
                Filtros
              </Button>
              <Button
                type="button"
                onClick={() => setIsCreateModalOpen(true)}
                className="gap-2"
              >
                <Plus className="h-4 w-4" />
                Crear informe
              </Button>
            </div>
          )}
        </div>

        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código de muestra, especie o cliente..."
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
              <option value="draft">Borradores</option>
              <option value="validated">Validados</option>
              <option value="generated">Generados</option>
              <option value="sent">Enviados</option>
            </select>
          </CardContent>
        </Card>

        {/* Tabs de clientes para usuarios consumidor */}
        {userRole === 'consumidor' && clientTabs.length > 1 && (
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-4 overflow-x-auto">
              {clientTabs.map((client) => (
                <button
                  key={client.id}
                  type="button"
                  onClick={() => setSelectedClientId(client.id)}
                  className={cn(
                    'whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors',
                    selectedClientId === client.id
                      ? 'border-green-600 text-green-700'
                      : 'border-transparent text-muted-foreground hover:border-gray-300 hover:text-foreground'
                  )}
                >
                  {client.name}
                </button>
              ))}
            </nav>
          </div>
        )}

        <Card className="overflow-hidden">
          {userRole === 'consumidor' && linkedClientIds.length === 0 ? (
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No tienes clientes vinculados</CardTitle>
              <CardDescription>
                Contacta a tu administrador para que te asigne clientes
              </CardDescription>
            </CardContent>
          ) : filteredReports.length === 0 ? (
            <CardContent className="flex flex-col items-center py-12 text-center">
              <FileText className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No hay informes</CardTitle>
              <CardDescription>
                Los informes aparecerán aquí una vez generados
              </CardDescription>
            </CardContent>
          ) : (
            <>
              <CardHeader className="border-b border-gray-100 py-3">
                <CardDescription>
                  Haz clic en cualquier fila para ver el informe
                </CardDescription>
              </CardHeader>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <BulkSelectionToolbarRow
                      columnSpan={9}
                      selectedCount={selectedReports.size}
                      filteredRowCount={filteredReports.length}
                      selectionSummaryText={`${selectedReports.size} informe(s) seleccionado(s)`}
                      onSelectAll={handleSelectAll}
                      onClearSelection={clearSelection}
                      validateAction={
                        userRole === 'admin' || userRole === 'validador'
                          ? {
                              onClick: handleBulkValidate,
                              disabled: isBulkValidating,
                              isLoading: isBulkValidating,
                            }
                          : null
                      }
                      deleteAction={
                        userRole === 'admin' || userRole === 'comun'
                          ? {
                              onClick: handleBulkDelete,
                              disabled: isBulkDeleting,
                              isLoading: isBulkDeleting,
                            }
                          : null
                      }
                    />
                    {selectedReports.size === 0 ? (
                      <TableRow>
                        <TableHead className="w-14">Tipo</TableHead>
                        {userRole !== 'consumidor' && (
                          <TableHead className="min-w-[120px]">Cliente</TableHead>
                        )}
                        <TableHead className="min-w-[150px]">Muestras</TableHead>
                        {userRole !== 'consumidor' && (
                          <TableHead className="hidden lg:table-cell">Plantilla</TableHead>
                        )}
                        <TableHead className="hidden md:table-cell">Estado</TableHead>
                        <TableHead className="hidden whitespace-nowrap lg:table-cell">
                          Fecha
                        </TableHead>
                        {userRole !== 'consumidor' && (
                          <TableHead className="hidden min-w-[100px] xl:table-cell">
                            Pago
                          </TableHead>
                        )}
                        <TableHead className="sticky right-0 z-10 w-32 bg-card">
                          Acciones
                        </TableHead>
                        {(userRole === 'admin' ||
                          userRole === 'validador' ||
                          userRole === 'comun') && (
                          <BulkSelectAllHeaderCheckbox
                            checked={
                              selectedReports.size === filteredReports.length &&
                              filteredReports.length > 0
                            }
                            onChange={handleSelectAll}
                          />
                        )}
                      </TableRow>
                    ) : null}
                  </TableHeader>
                  <TableBody>
                    {filteredReports.map((report) => {
                      const analysisIndicator = getAnalysisTypeIndicator(report.test_areas)
                      return (
                        <TableRow
                          key={report.id}
                          className="group cursor-pointer border-l-2 border-transparent hover:border-primary/40 hover:bg-accent/40"
                          onClick={() => setViewReportId(report.id)}
                        >
                          <TableCell>
                            <div
                              className={`flex h-10 w-10 items-center justify-center rounded-full text-sm font-bold shadow-sm ${analysisIndicator.bgColor} ${analysisIndicator.textColor}`}
                              title={analysisIndicator.label}
                            >
                              {analysisIndicator.initial}
                            </div>
                          </TableCell>
                          {userRole !== 'consumidor' && (
                            <TableCell>
                              <div className="min-w-0">
                                <div className="truncate font-medium text-foreground">
                                  {report.clients?.name || 'N/A'}
                                </div>
                                {report.clients?.rut && (
                                  <div className="truncate text-xs text-muted-foreground">
                                    RUT: {report.clients.rut}
                                  </div>
                                )}
                              </div>
                            </TableCell>
                          )}
                          <TableCell className="whitespace-normal">
                            <div className="min-w-0">
                              <SamplesDisplay
                                samples={
                                  report.results?.map((result) => ({
                                    code: result.samples?.code || 'N/A',
                                    species: result.samples?.species || '',
                                    variety: result.samples?.variety,
                                  })) || []
                                }
                              />
                            </div>
                          </TableCell>
                          {userRole !== 'consumidor' && (
                            <TableCell className="hidden lg:table-cell">
                              {getTemplateBadge(report.template)}
                            </TableCell>
                          )}
                          <TableCell className="hidden md:table-cell">
                            {getStatusBadge(report.status, report.id, report.completed)}
                          </TableCell>
                          <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                            {report.created_at
                              ? new Date(report.created_at).toLocaleDateString('es-ES')
                              : 'N/A'}
                          </TableCell>
                          {userRole !== 'consumidor' && (
                            <TableCell
                              className="hidden whitespace-normal xl:table-cell"
                              onClick={(e) => e.stopPropagation()}
                            >
                              {editingPayment === report.id ? (
                                <div className="min-w-48 space-y-3">
                                  <div className="flex items-center gap-2">
                                    <input
                                      type="checkbox"
                                      id={`payment-${report.id}`}
                                      checked={paymentData[report.id]?.payment || false}
                                      onChange={(e) =>
                                        setPaymentData((prev) => ({
                                          ...prev,
                                          [report.id]: {
                                            ...prev[report.id],
                                            payment: e.target.checked,
                                          },
                                        }))
                                      }
                                      className="h-4 w-4 rounded border-gray-300 text-green-600"
                                    />
                                    <label
                                      htmlFor={`payment-${report.id}`}
                                      className="text-sm text-foreground"
                                    >
                                      Pagado
                                    </label>
                                  </div>
                                  <Input
                                    type="text"
                                    placeholder="Número de factura"
                                    value={paymentData[report.id]?.invoice_number || ''}
                                    onChange={(e) =>
                                      setPaymentData((prev) => ({
                                        ...prev,
                                        [report.id]: {
                                          ...prev[report.id],
                                          invoice_number: e.target.value,
                                        },
                                      }))
                                    }
                                    className="h-8"
                                  />
                                  <div className="flex flex-wrap items-center gap-1">
                                    <Button
                                      type="button"
                                      size="xs"
                                      onClick={() => handleSavePayment(report.id)}
                                      disabled={savingPayment === report.id}
                                      className="gap-1"
                                    >
                                      <Save className="h-3 w-3" />
                                      {savingPayment === report.id ? 'Guardando...' : 'Guardar'}
                                    </Button>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="destructive"
                                      onClick={() => handleClearPayment(report.id)}
                                      disabled={savingPayment === report.id}
                                      className="gap-1"
                                    >
                                      <X className="h-3 w-3" />
                                      Limpiar
                                    </Button>
                                    <Button
                                      type="button"
                                      size="xs"
                                      variant="outline"
                                      onClick={() => handleCancelEdit(report.id)}
                                      disabled={savingPayment === report.id}
                                    >
                                      Cancelar
                                    </Button>
                                  </div>
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <div className="flex items-center gap-2">
                                    <span
                                      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                                        report.payment
                                          ? 'bg-green-100 text-green-800'
                                          : 'bg-red-100 text-red-800'
                                      }`}
                                    >
                                      {report.payment ? 'Pagado' : 'Pendiente'}
                                    </span>
                                    {(userRole === 'admin' ||
                                      userRole === 'validador' ||
                                      userRole === 'comun') && (
                                      <Button
                                        type="button"
                                        variant="link"
                                        size="xs"
                                        onClick={() =>
                                          handleEditPayment(
                                            report.id,
                                            report.payment || false,
                                            report.invoice_number || ''
                                          )
                                        }
                                        className="h-auto px-0"
                                      >
                                        Editar
                                      </Button>
                                    )}
                                  </div>
                                  {report.invoice_number && (
                                    <div className="font-mono text-xs text-muted-foreground">
                                      {report.invoice_number}
                                    </div>
                                  )}
                                </div>
                              )}
                            </TableCell>
                          )}
                          <TableCell
                            className="sticky right-0 z-10 bg-card group-hover:bg-accent/40"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1">
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={() => setViewReportId(report.id)}
                                title="Ver"
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                              {report.download_url && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  title="Descargar"
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                              )}
                              {(userRole === 'admin' || userRole === 'validador') &&
                                report.status !== 'sent' && (
                                  <>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      title="Editar"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                    <Button
                                      type="button"
                                      variant="ghost"
                                      size="icon-sm"
                                      title="Enviar"
                                    >
                                      <Send className="h-4 w-4" />
                                    </Button>
                                  </>
                                )}
                              {(userRole === 'admin' || userRole === 'comun') && (
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() =>
                                    handleDeleteReport(report.id, report.status)
                                  }
                                  disabled={isDeleting === report.id}
                                  title="Eliminar"
                                  className="text-destructive hover:text-destructive"
                                >
                                  {isDeleting === report.id ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <Trash2 className="h-4 w-4" />
                                  )}
                                </Button>
                              )}
                            </div>
                          </TableCell>
                          {(userRole === 'admin' ||
                            userRole === 'validador' ||
                            userRole === 'comun') && (
                            <BulkRowSelectionCheckbox
                              checked={selectedReports.has(report.id)}
                              onChange={() => handleSelectReport(report.id)}
                            />
                          )}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </>
          )}
        </Card>

        <CreateReportModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchReports()
          }}
        />

        <ViewReportModal
          isOpen={viewReportId !== null}
          onClose={() => setViewReportId(null)}
          reportId={viewReportId}
        />

        <FeedbackModal
          isOpen={isFeedbackModalOpen}
          onClose={() => setIsFeedbackModalOpen(false)}
        />
      </div>
    </DashboardLayout>
  )
}
