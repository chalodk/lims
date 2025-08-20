'use client'

import { useState, useEffect } from 'react'
import { ResultWithRelations } from '@/types/database'
import { 
  FlaskConical,
  X,
  Calendar,
  User,
  TestTube,
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  Microscope,
  Bug,
  TrendingUp,
  Shield,
  Loader2
} from 'lucide-react'

interface ViewResultModalProps {
  isOpen: boolean
  onClose: () => void
  resultId: string | null
}

export default function ViewResultModal({ isOpen, onClose, resultId }: ViewResultModalProps) {
  const [result, setResult] = useState<ResultWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (isOpen && resultId) {
      fetchResult()
    }
  }, [isOpen, resultId])

  const fetchResult = async () => {
    if (!resultId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/results/${resultId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch result details')
      }
      
      const data = await response.json()
      setResult(data)
    } catch (error) {
      console.error('Error fetching result:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el resultado')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      pending: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: Clock, text: 'Pendiente' },
      completed: { color: 'bg-blue-100 text-blue-800 border-blue-200', icon: CheckCircle, text: 'Completado' },
      validated: { color: 'bg-green-100 text-green-800 border-green-200', icon: CheckCircle, text: 'Validado' }
    }
    
    const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.pending
    const IconComponent = config.icon
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <IconComponent className="w-4 h-4 mr-2" />
        {config.text}
      </span>
    )
  }

  const getResultTypeBadge = (resultType: string | null) => {
    if (!resultType) return null
    
    const typeConfig = {
      positive: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Positivo' },
      negative: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Negativo' },
      inconclusive: { color: 'bg-gray-100 text-gray-800 border-gray-200', text: 'No conclusivo' }
    }
    
    const config = typeConfig[resultType as keyof typeof typeConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        {config.text}
      </span>
    )
  }

  const getSeverityBadge = (severity: string | null) => {
    if (!severity) return null
    
    const severityConfig = {
      low: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Baja' },
      moderate: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Moderada' },
      high: { color: 'bg-orange-100 text-orange-800 border-orange-200', text: 'Alta' },
      severe: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Severa' }
    }
    
    const config = severityConfig[severity as keyof typeof severityConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <TrendingUp className="w-4 h-4 mr-2" />
        {config.text}
      </span>
    )
  }

  const getConfidenceBadge = (confidence: string | null) => {
    if (!confidence) return null
    
    const confidenceConfig = {
      low: { color: 'bg-red-100 text-red-800 border-red-200', text: 'Baja' },
      medium: { color: 'bg-yellow-100 text-yellow-800 border-yellow-200', text: 'Media' },
      high: { color: 'bg-green-100 text-green-800 border-green-200', text: 'Alta' }
    }
    
    const config = confidenceConfig[confidence as keyof typeof confidenceConfig]
    if (!config) return null
    
    return (
      <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium border ${config.color}`}>
        <Shield className="w-4 h-4 mr-2" />
        Confianza {config.text}
      </span>
    )
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          {/* Header */}
          <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <FlaskConical className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Detalles del Resultado
                  </h3>
                  <p className="text-sm text-gray-500">
                    {result?.samples?.code ? `Muestra: ${result.samples.code}` : 'Información del resultado de análisis'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="ml-2 text-gray-600">Cargando resultado...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchResult}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200"
                >
                  Reintentar
                </button>
              </div>
            ) : result ? (
              <div className="space-y-6">
                {/* Status and Basic Info */}
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Estado y Resultados</h4>
                    <div className="space-y-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estado</label>
                        {getStatusBadge(result.status)}
                      </div>
                      {result.result_type && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo de Resultado</label>
                          {getResultTypeBadge(result.result_type)}
                        </div>
                      )}
                      {result.severity && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Severidad</label>
                          {getSeverityBadge(result.severity)}
                        </div>
                      )}
                      {result.confidence && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Confianza</label>
                          {getConfidenceBadge(result.confidence)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Información de la Muestra</h4>
                    <div className="space-y-2">
                      <div className="flex items-center">
                        <TestTube className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm font-medium">{result.samples?.code}</span>
                      </div>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">{result.samples?.clients?.name}</span>
                      </div>
                      <div className="flex items-center">
                        <Microscope className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">{result.samples?.species}</span>
                        {result.samples?.variety && (
                          <span className="text-sm text-gray-500"> - {result.samples.variety}</span>
                        )}
                      </div>
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm">
                          {result.samples?.received_date ? 
                            new Date(result.samples.received_date).toLocaleDateString() : 
                            'Fecha no disponible'
                          }
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Test Information */}
                {result.sample_tests && (
                  <div className="bg-blue-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <TestTube className="h-4 w-4 mr-2" />
                      Información del Análisis
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Área</label>
                        <p className="text-sm text-gray-900 capitalize">
                          {result.test_area?.replace('_', ' ') || 'No especificada'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Prueba</label>
                        <p className="text-sm text-gray-900">
                          {result.sample_tests.test_catalog?.name || 'No especificada'}
                        </p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Método</label>
                        <p className="text-sm text-gray-900">
                          {result.sample_tests.methods?.name || result.methodology || 'No especificado'}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Pathogen Information */}
                {result.pathogen_identified && (
                  <div className="bg-red-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <Bug className="h-4 w-4 mr-2" />
                      Información del Patógeno
                    </h4>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Patógeno Identificado</label>
                        <p className="text-sm text-gray-900 font-medium">
                          {result.pathogen_identified}
                        </p>
                      </div>
                      {result.pathogen_type && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Tipo</label>
                          <p className="text-sm text-gray-900 capitalize">
                            {result.pathogen_type}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Clinical Information */}
                {(result.diagnosis || result.conclusion) && (
                  <div className="bg-yellow-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                      <FileText className="h-4 w-4 mr-2" />
                      Información Clínica
                    </h4>
                    <div className="space-y-4">
                      {result.diagnosis && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Diagnóstico</label>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {result.diagnosis}
                          </p>
                        </div>
                      )}
                      {result.conclusion && (
                        <div>
                          <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Conclusión</label>
                          <p className="text-sm text-gray-900 whitespace-pre-wrap">
                            {result.conclusion}
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* Recommendations */}
                {result.recommendations && (
                  <div className="bg-green-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Recomendaciones</h4>
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {result.recommendations}
                    </p>
                  </div>
                )}

                {/* Technical Findings */}
                {result.findings && Object.keys(result.findings).length > 0 && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h4 className="text-sm font-medium text-gray-900 mb-3">Hallazgos Técnicos</h4>
                    <div className="bg-white rounded border p-3">
                      <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                        {JSON.stringify(result.findings, null, 2)}
                      </pre>
                    </div>
                  </div>
                )}

                {/* Personnel Information */}
                <div className="bg-gray-50 rounded-lg p-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-3">Información del Personal</h4>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <div>
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Realizado por</label>
                      <div className="flex items-center">
                        <User className="h-4 w-4 text-gray-400 mr-2" />
                        <span className="text-sm text-gray-900">
                          {result.performed_by_user?.name || result.performed_by_user?.email || 'No disponible'}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(result.performed_at).toLocaleString()}
                      </p>
                    </div>
                    {result.validated_by_user && (
                      <div>
                        <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Validado por</label>
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-2" />
                          <span className="text-sm text-gray-900">
                            {result.validated_by_user.name || result.validated_by_user.email}
                          </span>
                        </div>
                        {result.validation_date && (
                          <p className="text-xs text-gray-500 mt-1">
                            {new Date(result.validation_date).toLocaleString()}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12">
                <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Resultado no encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  El resultado solicitado no se pudo encontrar.
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="bg-gray-50 px-6 py-3 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}