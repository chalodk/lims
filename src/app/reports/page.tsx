'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateReportModal from '@/components/reports/CreateReportModal'
import ViewReportModal from '@/components/reports/ViewReportModal'
import SamplesDisplay from '@/components/reports/SamplesDisplay'
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
  Check
} from 'lucide-react'

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

export default function ReportsPage() {
  const { userRole, isLoading: authLoading, user, isAuthenticated } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [viewReportId, setViewReportId] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{[key: string]: { payment: boolean, invoice_number: string }}>({})
  const [savingPayment, setSavingPayment] = useState<string | null>(null)
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const hasFetchedRef = useRef<string | false>(false)
  
  const supabase = getSupabaseClient()

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

      // Si el usuario es consumidor, solo mostrar informes de su cliente vinculado Y que estén validados
      if (userRole === 'consumidor' && user?.client_id) {
        query = query.eq('client_id', user.client_id)
        query = query.eq('completed', true) // Solo mostrar informes validados
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
  }, [statusFilter, supabase, userRole, user?.client_id])

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
    
    // Crear una clave única basada en las dependencias reales
    const fetchKey = `${statusFilter}-${userRole}-${user?.client_id || 'none'}`
    
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
  }, [authLoading, user, isAuthenticated, statusFilter, userRole, user?.client_id])

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
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 border border-gray-200">
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
              className="hover:bg-gray-200 rounded p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
        <span className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium border ${
          statusConfig.validated || 'bg-purple-100 text-purple-800 border-purple-200'
        }`}>
          {canValidate ? (
            <button
              onClick={(e) => {
                e.stopPropagation()
                handleUnvalidateReport(reportId)
              }}
              disabled={isUpdating}
              className="hover:bg-purple-200 rounded p-0.5 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
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
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        templateConfig[template as keyof typeof templateConfig] || 'bg-gray-100 text-gray-800'
      }`}>
        {templateLabels[template as keyof typeof templateLabels] || template}
      </span>
    )
  }

  /**
   * Determines the analysis type from test_areas and returns the initial and color
   * @param testAreas - Array of test area strings
   * @returns Object with initial, label, and color classes
   */
  const getAnalysisTypeIndicator = (testAreas: string[] | null | undefined) => {
    if (!testAreas || testAreas.length === 0) {
      return {
        initial: '?',
        label: 'Desconocido',
        bgColor: 'bg-gray-500',
        textColor: 'text-white'
      }
    }

    // Check all test areas to determine the primary type
    const testAreasLower = testAreas.map(area => area.toLowerCase()).join(' ')
    
    if (testAreasLower.includes('virus') || testAreasLower.includes('viral') || testAreasLower.includes('virolog')) {
      return {
        initial: 'V',
        label: 'Virológico',
        bgColor: 'bg-indigo-600',
        textColor: 'text-white'
      }
    } else if (testAreasLower.includes('bacter') || testAreasLower.includes('bacteriolog')) {
      return {
        initial: 'B',
        label: 'Bacteriológico',
        bgColor: 'bg-blue-600',
        textColor: 'text-white'
      }
    } else if (testAreasLower.includes('fitopatolog') || testAreasLower.includes('pathog') || testAreasLower.includes('fung')) {
      return {
        initial: 'F',
        label: 'Fitopatológico',
        bgColor: 'bg-green-600',
        textColor: 'text-white'
      }
    } else if (testAreasLower.includes('deteccion') || testAreasLower.includes('precoz')) {
      return {
        initial: 'DP',
        label: 'Detección Precoz',
        bgColor: 'bg-yellow-600',
        textColor: 'text-white'
      }
    } else if (testAreasLower.includes('nematod') || testAreasLower.includes('nematolog')) {
      return {
        initial: 'N',
        label: 'Nematodos',
        bgColor: 'bg-purple-600',
        textColor: 'text-white'
      }
    }

    // Default
    return {
      initial: '?',
      label: 'Otro',
      bgColor: 'bg-gray-500',
      textColor: 'text-white'
    }
  }

  return (
    <DashboardLayout>
      {/* Show loading while fetching data or auth is loading */}
      {(authLoading || isLoading) ? (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        </div>
      ) : (
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
              <p className="text-gray-600">
                {userRole === 'consumidor' 
                  ? 'Informes de análisis de tus muestras' 
                  : 'Gestiona y genera informes de análisis'}
              </p>
              {userRole === 'consumidor' && user?.client_id && (
                <p className="text-sm text-blue-600 mt-1">
                  📋 Mostrando solo informes validados vinculados a tu cuenta
                </p>
              )}
            </div>
            {(userRole === 'admin' || userRole === 'comun') && (
              <div className="flex space-x-3">
                <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors">
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </button>
                <button 
                  onClick={() => setIsCreateModalOpen(true)}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
                >
                  <Plus className="h-4 w-4" />
                  <span>Crear informe</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código de muestra, especie o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borradores</option>
                <option value="validated">Validados</option>
                <option value="generated">Generados</option>
                <option value="sent">Enviados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay informes</h3>
              <p className="text-gray-500">Los informes aparecerán aquí una vez generados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-14">
                      Tipo
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Cliente
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Muestras
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Plantilla
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden xl:table-cell min-w-[100px]">
                      Pago
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sticky right-0 bg-gray-50 z-10">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => {
                    const analysisIndicator = getAnalysisTypeIndicator(report.test_areas)
                    return (
                    <tr key={report.id} className="group hover:bg-gray-50">
                      <td className="px-3 py-4">
                        <div 
                          className={`w-10 h-10 rounded-full ${analysisIndicator.bgColor} ${analysisIndicator.textColor} flex items-center justify-center font-bold text-sm shadow-sm`}
                          title={analysisIndicator.label}
                        >
                          {analysisIndicator.initial}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="min-w-0">
                          <div className="font-medium text-gray-900 truncate">{report.clients?.name || 'N/A'}</div>
                          {report.clients?.rut && (
                            <div className="text-xs text-gray-500 truncate">RUT: {report.clients.rut}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <div className="min-w-0">
                          <SamplesDisplay 
                            samples={report.results?.map(result => ({
                              code: result.samples?.code || 'N/A',
                              species: result.samples?.species || '',
                              variety: result.samples?.variety
                            })) || []}
                          />
                        </div>
                      </td>
                      <td className="px-3 py-4 hidden lg:table-cell">
                        {getTemplateBadge(report.template)}
                      </td>
                      <td className="px-3 py-4 hidden md:table-cell">
                        {getStatusBadge(report.status, report.id, report.completed)}
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      <td className="px-3 py-4 hidden xl:table-cell">
                        {editingPayment === report.id ? (
                          <div className="space-y-3 min-w-48">
                            <div className="flex items-center gap-2">
                              <input
                                type="checkbox"
                                id={`payment-${report.id}`}
                                checked={paymentData[report.id]?.payment || false}
                                onChange={(e) => setPaymentData(prev => ({
                                  ...prev,
                                  [report.id]: {
                                    ...prev[report.id],
                                    payment: e.target.checked
                                  }
                                }))}
                                className="h-4 w-4 text-green-600 rounded border-gray-300"
                              />
                              <label htmlFor={`payment-${report.id}`} className="text-sm text-gray-700">
                                Pagado
                              </label>
                            </div>
                            
                            <div>
                              <input
                                type="text"
                                placeholder="Número de factura"
                                value={paymentData[report.id]?.invoice_number || ''}
                                onChange={(e) => setPaymentData(prev => ({
                                  ...prev,
                                  [report.id]: {
                                    ...prev[report.id],
                                    invoice_number: e.target.value
                                  }
                                }))}
                                className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-indigo-500"
                              />
                            </div>
                            
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => handleSavePayment(report.id)}
                                disabled={savingPayment === report.id}
                                className="flex items-center gap-1 px-2 py-1 bg-green-600 text-white text-xs font-medium rounded hover:bg-green-700 disabled:opacity-50"
                              >
                                <Save className="h-3 w-3" />
                                {savingPayment === report.id ? 'Guardando...' : 'Guardar'}
                              </button>
                              
                              <button
                                onClick={() => handleClearPayment(report.id)}
                                disabled={savingPayment === report.id}
                                className="flex items-center gap-1 px-2 py-1 bg-red-600 text-white text-xs font-medium rounded hover:bg-red-700 disabled:opacity-50"
                              >
                                <X className="h-3 w-3" />
                                Limpiar
                              </button>
                              
                              <button
                                onClick={() => handleCancelEdit(report.id)}
                                disabled={savingPayment === report.id}
                                className="px-2 py-1 border border-gray-300 text-gray-700 text-xs font-medium rounded hover:bg-gray-50 disabled:opacity-50"
                              >
                                Cancelar
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-1">
                            <div className="flex items-center gap-2">
                              <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                                report.payment 
                                  ? 'bg-green-100 text-green-800' 
                                  : 'bg-red-100 text-red-800'
                              }`}>
                                {report.payment ? 'Pagado' : 'Pendiente'}
                              </span>
                              {(userRole === 'admin' || userRole === 'validador' || userRole === 'comun') && (
                              <button
                                onClick={() => handleEditPayment(report.id, report.payment || false, report.invoice_number || '')}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Editar
                              </button>
                              )}
                            </div>
                            {report.invoice_number && (
                              <div className="text-xs text-gray-600">
                                <span className="font-mono">{report.invoice_number}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-4 sticky right-0 bg-white z-10 group-hover:bg-gray-50">
                        <div className="flex items-center space-x-1">
                          <button 
                            onClick={() => setViewReportId(report.id)}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" 
                            title="Ver"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {report.download_url && (
                            <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Descargar">
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {(userRole === 'admin' || userRole === 'validador') && report.status !== 'sent' && (
                            <>
                              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors" title="Enviar">
                                <Send className="h-4 w-4" />
                              </button>
                            </>
                          )}
                          {(userRole === 'admin' || userRole === 'comun') && (
                            <button 
                              onClick={() => handleDeleteReport(report.id, report.status)}
                              disabled={isDeleting === report.id}
                              className="p-1 text-gray-400 hover:text-red-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed" 
                              title="Eliminar"
                            >
                              {isDeleting === report.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Trash2 className="h-4 w-4" />
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
        
        {/* Create Report Modal */}
        <CreateReportModal
          isOpen={isCreateModalOpen}
          onClose={() => setIsCreateModalOpen(false)}
          onSuccess={() => {
            setIsCreateModalOpen(false)
            fetchReports()
          }}
        />
        
        {/* View Report Modal */}
        <ViewReportModal
          isOpen={viewReportId !== null}
          onClose={() => setViewReportId(null)}
          reportId={viewReportId}
        />
      </div>
      )}
    </DashboardLayout>
  )
}