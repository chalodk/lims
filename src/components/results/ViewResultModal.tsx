'use client'

import { useState, useEffect, useCallback } from 'react'
import { ResultWithRelations } from '@/types/database'
import { useAuth } from '@/contexts/AuthContext'

interface NematodeEntry {
  name: string
  quantity: string
}

interface NematologyFindings {
  type: 'nematologia_positive' | 'nematologia_negative'
  nematodes: NematodeEntry[]
}

interface VirologyTest {
  identification: string
  method: string
  virus: string
  result: 'positive' | 'negative' | string
}

interface VirologyFindings {
  type: 'virologia'
  tests: VirologyTest[]
}

interface PhytopathologyTest {
  identification: string
  microorganism: string
  dilutions: {
    '10-1': string
    '10-2': string
    '10-3': string
  }
}

interface PhytopathologyFindings {
  type: 'fitopatologia'
  tests: PhytopathologyTest[]
}


// Type guard functions
function isNematologyFindings(f: unknown): f is NematologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'nematodes' in f &&
    ((f as Record<string, unknown>).type === 'nematologia_positive' || 
     (f as Record<string, unknown>).type === 'nematologia_negative') &&
    Array.isArray((f as Record<string, unknown>).nematodes)
  )
}

function isVirologyFindings(f: unknown): f is VirologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'tests' in f &&
    (f as Record<string, unknown>).type === 'virologia' &&
    Array.isArray((f as Record<string, unknown>).tests)
  )
}

function isPhytopathologyFindings(f: unknown): f is PhytopathologyFindings {
  return (
    typeof f === 'object' &&
    f !== null &&
    'type' in f &&
    'tests' in f &&
    (f as Record<string, unknown>).type === 'fitopatologia' &&
    Array.isArray((f as Record<string, unknown>).tests)
  )
}

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
  Loader2,
  CheckCheck
} from 'lucide-react'

interface ViewResultModalProps {
  isOpen: boolean
  onClose: () => void
  resultId: string | null
  onValidated?: () => void
}

export default function ViewResultModal({ isOpen, onClose, resultId, onValidated }: ViewResultModalProps) {
  const { userRole } = useAuth()
  const [result, setResult] = useState<ResultWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isValidating, setIsValidating] = useState(false)

  const fetchResult = useCallback(async () => {
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
  }, [resultId])

  useEffect(() => {
    if (isOpen && resultId) {
      fetchResult()
    }
  }, [isOpen, resultId, fetchResult])

  const handleValidateResult = async () => {
    if (!result || !resultId) return

    if (!confirm('¿Estás seguro de que quieres validar este resultado? Esta acción no se puede deshacer.')) {
      return
    }

    setIsValidating(true)
    try {
      const response = await fetch(`/api/results/${resultId}/validate`, {
        method: 'PATCH',
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Error al validar el resultado')
      }

      await fetchResult()
      
      if (onValidated) {
        onValidated()
      }
      
      alert('Resultado validado exitosamente')
    } catch (error) {
      console.error('Error validating result:', error)
      alert('Error al validar el resultado. Por favor, intente nuevamente.')
    } finally {
      setIsValidating(false)
    }
  }

  const getStatusBadge = (status: string | null) => {
    if (!status) {
      return (
        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
          Sin estado
        </span>
      )
    }
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

  const renderNematologyFindings = (findings: unknown) => {
    if (!isNematologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-green-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-green-900 flex items-center">
            <Bug className="h-4 w-4 mr-2" />
            Resultados de Nematología
            <span className={`ml-2 px-2 py-1 rounded text-xs font-medium ${
              findings.type === 'nematologia_positive' 
                ? 'bg-red-100 text-red-700' 
                : 'bg-green-100 text-green-700'
            }`}>
              {findings.type === 'nematologia_positive' ? 'Positivo' : 'Negativo'}
            </span>
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Nemátodo
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Cantidad nematodos/250 cm³ de suelo
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.nematodes.map((nematode: NematodeEntry, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {nematode.name || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {nematode.quantity || 'No especificado'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderVirologyFindings = (findings: unknown) => {
    if (!isVirologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-blue-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-blue-900 flex items-center">
            <Microscope className="h-4 w-4 mr-2" />
            Resultados de Virología
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Técnica utilizada
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Virus
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Resultado
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.tests.map((test: VirologyTest, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {test.identification || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.method || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.virus || 'No especificado'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                      test.result === 'positive' 
                        ? 'bg-red-100 text-red-700' 
                        : test.result === 'negative'
                        ? 'bg-green-100 text-green-700'
                        : 'bg-gray-100 text-gray-700'
                    }`}>
                      {test.result === 'positive' ? 'Positivo' : 
                       test.result === 'negative' ? 'Negativo' : 
                       test.result || 'No especificado'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    )
  }

  const renderPhytopathologyFindings = (findings: unknown) => {
    if (!isPhytopathologyFindings(findings)) {
      return null
    }

    return (
      <div className="bg-white rounded border overflow-hidden">
        <div className="bg-yellow-50 px-4 py-3 border-b">
          <h5 className="text-sm font-medium text-yellow-900 flex items-center">
            <Microscope className="h-4 w-4 mr-2" />
            Resultados de Fitopatología
          </h5>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-yellow-50">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  N° de muestra
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Identificación de la muestra
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Microorganismo Identificado
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider" colSpan={3}>
                  Recuento de microorganismos (N° de colonias/dilución)
                </th>
              </tr>
              <tr className="bg-yellow-100">
                <th colSpan={3}></th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase">
                  Dilución utilizada
                </th>
                <th colSpan={2}></th>
              </tr>
              <tr className="bg-yellow-100">
                <th colSpan={3}></th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  10⁻¹
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  10⁻²
                </th>
                <th className="px-4 py-2 text-center text-xs font-medium text-gray-500">
                  10⁻³
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {findings.tests.map((test: PhytopathologyTest, index: number) => (
                <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {index + 1}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">
                    {test.identification || 'No especificado'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                    {test.microorganism || 'No especificado'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-1'] || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-2'] || '-'}
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 text-center font-mono">
                    {test.dilutions?.['10-3'] || '-'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
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
                          {(() => {
                            const findingsMethodologies = (result.findings as Record<string, unknown>)?.methodologies
                            if (findingsMethodologies && Array.isArray(findingsMethodologies) && findingsMethodologies.length > 0) {
                              return findingsMethodologies.join(', ')
                            }
                            return result.sample_tests.methods?.name || result.methodology || 'No especificado'
                          })()}
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
                    
                    {/* Render specialized findings tables if applicable */}
                    {renderNematologyFindings(result.findings)}
                    {renderVirologyFindings(result.findings)}
                    {renderPhytopathologyFindings(result.findings)}
                    
                    {/* Fallback to JSON display for non-specialized findings */}
                    {!renderNematologyFindings(result.findings) && !renderVirologyFindings(result.findings) && !renderPhytopathologyFindings(result.findings) && (
                      <div className="bg-white rounded border p-3">
                        <pre className="text-sm text-gray-700 whitespace-pre-wrap">
                          {JSON.stringify(result.findings, null, 2)}
                        </pre>
                      </div>
                    )}
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
                        {result.performed_at ? new Date(result.performed_at).toLocaleString() : 'N/A'}
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
          <div className="bg-gray-50 px-6 py-3 flex justify-between items-center">
            <div className="flex space-x-3">
              {result && result.status !== 'validated' && (userRole === 'admin' || userRole === 'validador') && (
                <button
                  type="button"
                  onClick={handleValidateResult}
                  disabled={isValidating}
                  className="inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isValidating ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Validando...
                    </>
                  ) : (
                    <>
                      <CheckCheck className="h-4 w-4 mr-2" />
                      Validar Resultado
                    </>
                  )}
                </button>
              )}
            </div>
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