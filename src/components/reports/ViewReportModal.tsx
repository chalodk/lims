'use client'

import { useState, useEffect, useCallback } from 'react'
import { 
  X, 
  FileText, 
  User, 
  Building2, 
  Calendar,
  TestTube,
  Microscope,
  AlertCircle,
  CheckCircle,
  XCircle,
  Loader2,
  Download,
  Phone,
  Mail,
  MapPin
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

  const getResultTypeBadge = (resultType: string) => {
    const typeConfig = {
      positive: { color: 'text-red-600 bg-red-50', text: 'POSITIVO', icon: AlertCircle },
      negative: { color: 'text-green-600 bg-green-50', text: 'NEGATIVO', icon: CheckCircle },
      inconclusive: { color: 'text-gray-600 bg-gray-50', text: 'NO CONCLUSIVO', icon: XCircle }
    }
    
    const config = typeConfig[resultType as keyof typeof typeConfig] || typeConfig.inconclusive
    const IconComponent = config.icon
    
    return (
      <div className={`inline-flex items-center px-4 py-2 rounded-lg border-2 ${config.color} font-bold text-lg`}>
        <IconComponent className="h-5 w-5 mr-2" />
        {config.text}
      </div>
    )
  }

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
          <div className="bg-white px-8 py-6" style={{ fontFamily: 'system-ui, -apple-system, sans-serif' }}>
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
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
              <div className="max-w-4xl mx-auto space-y-8 print:space-y-6">
                {/* Header Section */}
                <div className="text-center border-b-2 border-blue-600 pb-6">
                  <h1 className="text-3xl font-bold text-gray-900 mb-2">
                    INFORME DE ANÁLISIS FITOSANITARIO
                  </h1>
                  <p className="text-lg text-gray-600">
                    Informe N° {report.id.slice(-8).toUpperCase()}
                  </p>
                  <p className="text-sm text-gray-500 mt-2">
                    Fecha de emisión: {formatDate(report.created_at)}
                  </p>
                </div>

                {/* 1. Client Identification */}
                <section className="bg-blue-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Building2 className="h-6 w-6 text-blue-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">CLIENTE</h2>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Razón Social</label>
                        <p className="text-base font-semibold text-gray-900">{report.clients.name}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                        <p className="text-base text-gray-900">{report.clients.rut || 'No especificado'}</p>
                      </div>
                    </div>
                    <div className="space-y-3">
                      {report.clients.contact_email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{report.clients.contact_email}</span>
                        </div>
                      )}
                      {report.clients.contact_phone && (
                        <div className="flex items-center">
                          <Phone className="h-4 w-4 text-gray-400 mr-2" />
                          <span className="text-sm text-gray-900">{report.clients.contact_phone}</span>
                        </div>
                      )}
                      {report.clients.address && (
                        <div className="flex items-start">
                          <MapPin className="h-4 w-4 text-gray-400 mr-2 mt-0.5" />
                          <span className="text-sm text-gray-900">{report.clients.address}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </section>

                {/* 2. Sample and Analysis Information */}
                {report.results.map((result) => (
                  <section key={result.id} className="bg-gray-50 rounded-lg p-6">
                    <div className="flex items-center mb-4">
                      <TestTube className="h-6 w-6 text-green-600 mr-3" />
                      <h2 className="text-xl font-bold text-gray-900">
                        Muestra y Análisis
                      </h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Código de Muestra</label>
                          <p className="text-base font-mono font-semibold text-gray-900">{result.samples.code}</p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
                          <p className="text-base text-gray-900">{result.samples.species}</p>
                        </div>
                        {result.samples.variety && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                            <p className="text-base text-gray-900">{result.samples.variety}</p>
                          </div>
                        )}
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de Recepción</label>
                          <p className="text-base text-gray-900">{formatDate(result.samples.received_date)}</p>
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Análisis</label>
                          <p className="text-base text-gray-900">
                            {result.sample_tests?.test_catalog?.name || 'No especificado'}
                          </p>
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-1">Área</label>
                          <p className="text-base text-gray-900 capitalize">{result.test_area?.replace('_', ' ')}</p>
                        </div>
                        {result.sample_tests?.methods && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Metodología</label>
                            <p className="text-base text-gray-900">{result.sample_tests.methods.name}</p>
                          </div>
                        )}
                        {result.samples.description && (
                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Descripción</label>
                            <p className="text-base text-gray-900">{result.samples.description}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </section>
                ))}

                {/* 3. Results Type */}
                <section className="bg-yellow-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <Microscope className="h-6 w-6 text-yellow-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">RESULTADOS</h2>
                  </div>
                  <div className="space-y-4">
                    {report.results.map((result) => (
                      <div key={result.id} className="flex items-center justify-between p-4 bg-white rounded-lg border">
                        <div>
                          <p className="font-medium text-gray-900">
                            Muestra: {result.samples.code} - {result.samples.species}
                          </p>
                          {result.pathogen_identified && (
                            <p className="text-sm text-gray-600 mt-1">
                              Patógeno identificado: <span className="font-medium">{result.pathogen_identified}</span>
                            </p>
                          )}
                        </div>
                        <div className="ml-4">
                          {getResultTypeBadge(result.result_type)}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* 4. Diagnosis, Conclusions and Recommendations */}
                <section className="bg-green-50 rounded-lg p-6">
                  <div className="flex items-center mb-4">
                    <FileText className="h-6 w-6 text-green-600 mr-3" />
                    <h2 className="text-xl font-bold text-gray-900">DIAGNÓSTICO, CONCLUSIONES Y RECOMENDACIONES</h2>
                  </div>
                  <div className="space-y-6">
                    {report.results.map((result) => (
                      <div key={result.id} className="bg-white rounded-lg border p-4">
                        <h3 className="font-semibold text-gray-900 mb-3">
                          Muestra: {result.samples.code}
                        </h3>
                        <div className="space-y-4">
                          {result.diagnosis && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">DIAGNÓSTICO</label>
                              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                {result.diagnosis}
                              </p>
                            </div>
                          )}
                          {result.conclusion && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">CONCLUSIÓN</label>
                              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                {result.conclusion}
                              </p>
                            </div>
                          )}
                          {result.recommendations && (
                            <div>
                              <label className="block text-sm font-bold text-gray-700 mb-2">RECOMENDACIONES</label>
                              <p className="text-base text-gray-900 leading-relaxed whitespace-pre-wrap">
                                {result.recommendations}
                              </p>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </section>

                {/* Footer Section */}
                <section className="border-t-2 border-gray-300 pt-6 mt-8">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Personal Responsable</h3>
                      {report.results.map((result) => (
                        <div key={result.id} className="space-y-2">
                          {result.performed_by_user && (
                            <div className="flex items-center">
                              <User className="h-4 w-4 text-gray-400 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Realizado por: {result.performed_by_user.name}
                                </p>
                                <p className="text-xs text-gray-500">{result.performed_by_user.email}</p>
                              </div>
                            </div>
                          )}
                          {result.validated_by_user && (
                            <div className="flex items-center">
                              <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                              <div>
                                <p className="text-sm font-medium text-gray-900">
                                  Validado por: {result.validated_by_user.name}
                                </p>
                                <p className="text-xs text-gray-500">{result.validated_by_user.email}</p>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                    <div>
                      <h3 className="font-bold text-gray-900 mb-2">Información del Informe</h3>
                      <div className="flex items-center mb-2">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <p className="text-sm text-gray-900">
                          Fecha de generación: {formatDate(report.created_at)}
                        </p>
                      </div>
                      {report.generated_by_user && (
                        <div className="flex items-center">
                          <User className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <p className="text-sm text-gray-900">
                              Generado por: {report.generated_by_user.name}
                            </p>
                            <p className="text-xs text-gray-500">{report.generated_by_user.email}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </section>
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