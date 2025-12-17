'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  FileText, 
  AlertCircle,
  Loader2,
  Download
} from 'lucide-react'

interface ReportData {
  id: string
  created_at: string
  status: string
  template: string
  include_recommendations: boolean
  include_images: boolean
  test_areas: string[]
  download_url?: string | null
  rendered_pdf_url?: string | null
  clients: {
    id: string
    name: string
    rut: string
    contact_email?: string
    contact_phone?: string
    address?: string
  }
  results: Array<{
    id: string
    status: string
    result_type: string
    diagnosis?: string
    conclusion?: string
    recommendations?: string
    pathogen_identified?: string
    pathogen_type?: string
    severity?: string
    confidence?: string
    methodology?: string
    findings?: unknown
    test_area?: string
    created_at: string
    samples: {
      id: string
      code: string
      species: string
      variety?: string
      received_date: string
      sampling_date?: string
      description?: string
    }
    sample_tests?: {
      id: string
      test_catalog?: {
        id: string
        name: string
        code: string
        area: string
        description?: string
      }
      methods?: {
        id: string
        name: string
        code: string
        description?: string
      }
    }
    performed_by_user?: {
      id: string
      name: string
      email: string
    }
    validated_by_user?: {
      id: string
      name: string
      email: string
    }
  }>
  generated_by_user?: {
    id: string
    name: string
    email: string
  }
  responsible_user?: {
    id: string
    name: string
    email: string
  }
}

interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string | null
}

export default function ViewReportModal({ isOpen, onClose, reportId }: ViewReportModalProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    if (!reportId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/reports/view/${reportId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report details')
      }
      
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el informe')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReport()
    } else {
      setReport(null)
      setError(null)
    }
  }, [isOpen, reportId, fetchReport])


  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-start justify-center min-h-screen pt-4 px-4 pb-20 text-center">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-top bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all my-8 max-w-5xl w-full max-h-[90vh] overflow-y-auto">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200 sticky top-0 z-10">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <FileText className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Informe de Análisis
                  </h3>
                  <p className="text-sm text-gray-500">
                    {report?.clients?.name} - {formatDate(report?.created_at || '')}
                  </p>
                </div>
              </div>
              <div className="flex items-center space-x-3">
                <button
                  type="button"
                  onClick={() => {
                    if (report?.download_url) {
                      window.open(report.download_url, '_blank')
                    } else {
                      alert('El archivo PDF aún no está disponible para descarga.')
                    }
                  }}
                  className="inline-flex items-center px-3 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
                >
                  <Download className="h-4 w-4 mr-2" />
                  Descargar PDF
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 h-[70vh] overflow-hidden">
            {isLoading ? (
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando informe...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchReport}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Reintentar
                </button>
              </div>
            ) : report ? (
              <div className="h-full">
                {report.rendered_pdf_url?.startsWith('https://') ? (
                  <iframe
                    src={report.rendered_pdf_url}
                    className="w-full h-full border-0 rounded"
                    title="Vista previa del informe PDF"
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    allow="fullscreen"
                  />
                ) : report.rendered_pdf_url ? (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <AlertCircle className="h-12 w-12 text-yellow-500 mb-4" />
                    <p className="text-lg text-gray-600">Vista previa no disponible</p>
                    <p className="text-sm text-gray-500 mt-2">La URL del documento no es segura</p>
                    <button
                      onClick={() => window.open(report.rendered_pdf_url!, '_blank')}
                      className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700"
                    >
                      <Download className="h-4 w-4 mr-2" />
                      Abrir en nueva pestaña
                    </button>
                  </div>
                ) : (
                  <div className="flex flex-col justify-center items-center h-full text-center">
                    <Loader2 className="h-12 w-12 animate-spin text-blue-600 mb-4" />
                    <p className="text-lg text-gray-600">Generando vista previa...</p>
                    <p className="text-sm text-gray-500 mt-2">El informe se está procesando</p>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-center py-12">
                <FileText className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Informe no encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  El informe solicitado no se pudo encontrar.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}