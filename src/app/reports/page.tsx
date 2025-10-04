'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateReportModal from '@/components/reports/CreateReportModal'
import ViewReportModal from '@/components/reports/ViewReportModal'
import { 
  FileText,
  Download,
  Send,
  Search,
  Filter,
  TestTube,
  Loader2,
  Eye,
  Edit,
  Plus,
  Trash2,
  Save,
  X
} from 'lucide-react'

interface Report {
  id: string
  status: string
  created_at: string
  template: string
  download_url?: string
  payment?: boolean | null
  invoice_number?: string | null
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
  const { userRole } = useAuth()
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
  
  const supabase = createClient()

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

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, supabase])

  useEffect(() => {
    fetchReports()
  }, [fetchReports])

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

  const getStatusBadge = (status: string | null) => {
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
      sent: 'bg-green-100 text-green-800 border-green-200'
    }

    const statusLabels = {
      draft: 'Borrador',
      generated: 'Generado',
      sent: 'Enviado'
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

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
              <p className="text-gray-600">Gestiona y genera informes de análisis</p>
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
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Muestras
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plantilla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Pago
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{report.clients?.name || 'N/A'}</div>
                          {report.clients?.rut && (
                            <div className="text-sm text-gray-500">RUT: {report.clients.rut}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="space-y-1">
                          {report.results && report.results.length > 0 ? (
                            report.results.map((result) => (
                              <div key={result.id} className="flex items-center">
                                <TestTube className="h-4 w-4 text-gray-400 mr-2" />
                                <span className="text-sm text-gray-900">
                                  {result.samples?.code || 'N/A'}
                                  {result.samples?.species && (
                                    <span className="text-gray-500 ml-1">({result.samples.species})</span>
                                  )}
                                </span>
                              </div>
                            ))
                          ) : (
                            <span className="text-sm text-gray-500">Sin muestras</span>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getTemplateBadge(report.template)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {report.created_at ? new Date(report.created_at).toLocaleDateString('es-ES') : 'N/A'}
                      </td>
                      <td className="px-6 py-4">
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
                              <button
                                onClick={() => handleEditPayment(report.id, report.payment || false, report.invoice_number || '')}
                                className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                              >
                                Editar
                              </button>
                            </div>
                            {report.invoice_number && (
                              <div className="text-xs text-gray-600">
                                <span className="font-mono">{report.invoice_number}</span>
                              </div>
                            )}
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
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
                  ))}
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
    </DashboardLayout>
  )
}