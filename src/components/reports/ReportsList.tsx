'use client'

import { useState, useEffect, useCallback } from 'react'
import { Report } from '@/types/database'
import { useReports } from '@/hooks/useReports'

interface ReportsListProps {
  sampleId: string
  onReportSelect?: (report: Report) => void
}

export function ReportsList({ sampleId, onReportSelect }: ReportsListProps) {
  const { fetchReportsForSample } = useReports()
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    loadReports()
  }, [sampleId, loadReports])

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

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-CL', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

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
                  Reporte v{report.version}
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
                  <span>Visibilidad: {report.visibility === 'client' ? 'Cliente' : 'Interno'}</span>
                </div>
              </div>
            </div>

            <div className="ml-4 flex flex-col gap-2">
              {report.rendered_pdf_url && (
                <a
                  href={report.rendered_pdf_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-800 text-sm font-medium"
                  onClick={(e) => e.stopPropagation()}
                >
                  Ver PDF
                </a>
              )}
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