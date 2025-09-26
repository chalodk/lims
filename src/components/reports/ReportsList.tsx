'use client'

import { useState, useEffect, useCallback } from 'react'
import { Report } from '@/types/database'
import { formatDate } from '@/lib/utils/formatters'
import { useReports } from '@/hooks/useReports'
import { Save, X, DollarSign } from 'lucide-react'

interface ReportsListProps {
  sampleId: string
  onReportSelect?: (report: Report) => void
}

export function ReportsList({ sampleId, onReportSelect }: ReportsListProps) {
  const { fetchReportsForSample } = useReports()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [editingPayment, setEditingPayment] = useState<string | null>(null)
  const [paymentData, setPaymentData] = useState<{[key: string]: { payment: boolean, invoice_number: string }}>({})
  const [savingPayment, setSavingPayment] = useState<string | null>(null)

  const loadReports = useCallback(async () => {
    setLoading(true)
    setError(null)
    
    try {
      const data = await fetchReportsForSample(sampleId)
      setReports(data)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading reports')
    } finally {
      setLoading(false)
    }
  }, [fetchReportsForSample, sampleId])

  useEffect(() => {
    loadReports()
  }, [sampleId, loadReports])

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
      setError(err instanceof Error ? err.message : 'Error updating payment information')
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
      setError(err instanceof Error ? err.message : 'Error clearing payment information')
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

  // formatDate utility imported above handles null values

  const getStatusBadge = (status: string) => {
    const baseClasses = 'px-2 py-1 text-xs font-medium rounded-full'
    switch (status) {
      case 'draft':
        return `${baseClasses} bg-gray-100 text-gray-800`
      case 'generated':
        return `${baseClasses} bg-green-100 text-green-800`
      case 'sent':
        return `${baseClasses} bg-blue-100 text-blue-800`
      default:
        return `${baseClasses} bg-gray-100 text-gray-800`
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case 'draft': return 'Borrador'
      case 'generated': return 'Generado'
      case 'sent': return 'Enviado'
      default: return status
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center p-6">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
        <span className="ml-2">Cargando reportes...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-md p-4">
        <p className="text-red-700">Error: {error}</p>
        <button
          onClick={loadReports}
          className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
        >
          Reintentar
        </button>
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="text-center p-6 text-gray-500">
        <p>No hay reportes generados para esta muestra.</p>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      {reports.map((report) => (
        <div
          key={report.id}
          className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 cursor-pointer transition-colors"
          onClick={() => onReportSelect?.(report)}
        >
          <div className="flex items-start justify-between">
            <div className="flex-1">
              <div className="flex items-center gap-2 mb-2">
                <h4 className="font-medium text-gray-900">
                  Reporte {report.template || 'Estándar'}
                </h4>
                <span className={getStatusBadge(report.status || 'draft')}>
                  {getStatusLabel(report.status || 'draft')}
                </span>
              </div>
              
              <div className="text-sm text-gray-600 space-y-1">
                <p>Creado: {formatDate(report.created_at)}</p>
                {report.delivery_date && (
                  <p>Fecha de entrega: {formatDate(report.delivery_date)}</p>
                )}
                <div className="flex items-center gap-4 text-xs">
                  <span>Recomendaciones: {report.include_recommendations ? 'Sí' : 'No'}</span>
                  <span>Imágenes: {report.include_images ? 'Sí' : 'No'}</span>
                  <span>Plantilla: {report.template || 'estándar'}</span>
                </div>
                
                {/* Payment Information Section */}
                <div className="mt-3 p-3 bg-gray-50 rounded-lg border" onClick={(e) => e.stopPropagation()}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <DollarSign className="h-4 w-4 text-gray-500" />
                      <span className="text-sm font-medium text-gray-700">Estado de Pago</span>
                    </div>
                    {editingPayment !== report.id && (
                      <button
                        onClick={() => handleEditPayment(report.id, report.payment || false, report.invoice_number || '')}
                        className="text-xs text-blue-600 hover:text-blue-800 font-medium"
                      >
                        Editar
                      </button>
                    )}
                  </div>
                  
                  {editingPayment === report.id ? (
                    <div className="space-y-3">
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
                        <label className="block text-xs font-medium text-gray-700 mb-1">
                          Número de Factura
                        </label>
                        <input
                          type="text"
                          placeholder="Ej: F-2024-001"
                          value={paymentData[report.id]?.invoice_number || ''}
                          onChange={(e) => setPaymentData(prev => ({
                            ...prev,
                            [report.id]: {
                              ...prev[report.id],
                              invoice_number: e.target.value
                            }
                          }))}
                          className="w-full px-2 py-1 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      </div>
                      
                      <div className="flex items-center gap-2 pt-2">
                        <button
                          onClick={() => handleSavePayment(report.id)}
                          disabled={savingPayment === report.id}
                          className="flex items-center gap-1 px-3 py-1 bg-green-600 text-white text-xs font-medium rounded-md hover:bg-green-700 disabled:opacity-50"
                        >
                          <Save className="h-3 w-3" />
                          {savingPayment === report.id ? 'Guardando...' : 'Guardar'}
                        </button>
                        
                        <button
                          onClick={() => handleClearPayment(report.id)}
                          disabled={savingPayment === report.id}
                          className="flex items-center gap-1 px-3 py-1 bg-red-600 text-white text-xs font-medium rounded-md hover:bg-red-700 disabled:opacity-50"
                        >
                          <X className="h-3 w-3" />
                          Limpiar
                        </button>
                        
                        <button
                          onClick={() => handleCancelEdit(report.id)}
                          disabled={savingPayment === report.id}
                          className="px-3 py-1 border border-gray-300 text-gray-700 text-xs font-medium rounded-md hover:bg-gray-50 disabled:opacity-50"
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
                      </div>
                      {report.invoice_number && (
                        <div className="text-xs text-gray-600">
                          Factura: <span className="font-mono">{report.invoice_number}</span>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="ml-4 flex flex-col gap-2">
              {report.download_url && (
                <a
                  href={report.download_url}
                  download
                  className="text-green-600 hover:text-green-800 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Descargar
                </a>
              )}
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}