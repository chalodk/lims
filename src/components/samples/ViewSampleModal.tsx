'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, ResultWithRelations } from '@/types/database'
import ViewResultModal from '@/components/results/ViewResultModal'
import AddResultModal from '@/components/results/AddResultModal'
import { 
  X, 
  TestTube, 
  FlaskConical, 
  Plus, 
  Eye, 
  CheckCircle, 
  Clock, 
  AlertCircle,
  Loader2
} from 'lucide-react'

interface ViewSampleModalProps {
  isOpen: boolean
  onClose: () => void
  sample: SampleWithClient
}

export default function ViewSampleModal({ isOpen, onClose, sample }: ViewSampleModalProps) {
  const { userRole } = useAuth()
  const [results, setResults] = useState<ResultWithRelations[]>([])
  const [loadingResults, setLoadingResults] = useState(false)
  const [showAddResultModal, setShowAddResultModal] = useState(false)
  const [showViewResultModal, setShowViewResultModal] = useState(false)
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  

  const fetchResults = useCallback(async () => {
    if (!isOpen || !sample.id) return

    try {
      setLoadingResults(true)
      const response = await fetch(`/api/results?sample_id=${sample.id}`)
      if (!response.ok) throw new Error('Failed to fetch results')
      
      const data = await response.json()
      const resultsArray = Array.isArray(data) ? data : (data.data || [])
      setResults(resultsArray)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setLoadingResults(false)
    }
  }, [isOpen, sample.id])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  if (!isOpen) return null

  const canCreateResults = userRole && ['admin', 'validador', 'comun'].includes(userRole)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  // Extract test information from sample_tests relationship
  const getTestInfo = () => {
    if (!sample.sample_tests || !Array.isArray(sample.sample_tests)) {
      return {
        analysisTypes: ['No especificado'],
        methodologies: ['No especificado'], 
        identificationTechniques: ['No especificado']
      }
    }

    const analysisTypes = sample.sample_tests
      .map(st => st.test_catalog?.area)
      .filter(Boolean)
      .filter((area, index, arr) => arr.indexOf(area) === index) // Remove duplicates

    const methodologies = sample.sample_tests
      .map(st => st.methods?.name)
      .filter(Boolean)
      .filter((method, index, arr) => arr.indexOf(method) === index) // Remove duplicates

    const testNames = sample.sample_tests
      .map(st => st.test_catalog?.name)
      .filter(Boolean)

    return {
      analysisTypes: analysisTypes.length > 0 ? analysisTypes : ['No especificado'],
      methodologies: methodologies.length > 0 ? methodologies : ['No especificado'],
      identificationTechniques: testNames.length > 0 ? testNames : ['No especificado']
    }
  }

  const parsedTests = getTestInfo()

  const getStatusLabel = (status: string) => {
    const statusLabels = {
      received: 'Recibida',
      processing: 'Procesando',
      microscopy: 'Microscopía',
      isolation: 'Aislamiento',
      identification: 'Identificación',
      molecular_analysis: 'Análisis Molecular',
      validation: 'Validación',
      completed: 'Completada'
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getSlaTypeLabel = (slaType: string) => {
    const slaTypeLabels = {
      normal: 'Normal',
      express: 'Express'
    }
    return slaTypeLabels[slaType as keyof typeof slaTypeLabels] || slaType
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                        <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <TestTube className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Detalles de la Muestra
                  </h3>
                  <p className="text-sm text-gray-500">
                    Código: {sample.code}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
              {/* Basic Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4">Información básica</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Código</label>
                <p className="text-sm text-gray-900">{sample.code}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Estado</label>
                <p className="text-sm text-gray-900">{getStatusLabel(sample.status || '')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Prioridad</label>
                <p className="text-sm text-gray-900">{getSlaTypeLabel(sample.sla_type || '')}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Proyecto</label>
                <p className="text-sm text-gray-900">{'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Especie</label>
                <p className="text-sm text-gray-900">{sample.species}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Variedad</label>
                <p className="text-sm text-gray-900">{sample.variety || 'No especificada'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Fecha de recepción</label>
                <p className="text-sm text-gray-900">{formatDate(sample.received_date)}</p>
              </div>

              {/* Agricultural Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información agrícola</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Año de plantación</label>
                <p className="text-sm text-gray-900">{sample.planting_year || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Cultivo anterior</label>
                <p className="text-sm text-gray-900">{sample.previous_crop || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Próximo cultivo</label>
                <p className="text-sm text-gray-900">{sample.next_crop || 'No especificado'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Terreno en barbecho</label>
                <p className="text-sm text-gray-900">{sample.fallow ? 'Sí' : 'No'}</p>
              </div>

              {/* Delivery Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información de entrega</h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Recolectada por</label>
                <p className="text-sm text-gray-900">{sample.taken_by === 'client' ? 'Cliente' : 'Laboratorio'}</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Método de muestreo</label>
                <p className="text-sm text-gray-900">{sample.sampling_method || 'No especificado'}</p>
              </div>

              {/* Analysis Information */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información del análisis</h4>
              </div>

              <div className="sm:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Patógeno sospechoso</label>
                <p className="text-sm text-gray-900">{sample.suspected_pathogen || 'No especificado'}</p>
              </div>

              {/* Analysis Types */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de análisis</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.analysisTypes.length > 0 ? parsedTests.analysisTypes.map(type => (
                    <span key={type} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {type}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Methodologies */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Metodología</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.methodologies.length > 0 ? parsedTests.methodologies.map(methodology => (
                    <span key={methodology} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                      {methodology}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Identification Techniques */}
              <div className="sm:col-span-2 lg:col-span-3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Técnica de identificación</label>
                <div className="flex flex-wrap gap-2 mt-2">
                  {parsedTests.identificationTechniques.length > 0 ? parsedTests.identificationTechniques.map(technique => (
                    <span key={technique} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                      {technique}
                    </span>
                  )) : (
                    <span className="text-sm text-gray-500">No especificado</span>
                  )}
                </div>
              </div>

              {/* Results Section */}
              <div className="sm:col-span-2 lg:col-span-3">
                <div className="flex items-center justify-between mb-4 mt-6">
                  <h4 className="text-md font-medium text-gray-900 flex items-center">
                    <FlaskConical className="h-5 w-5 mr-2" />
                    Resultados ({results.length})
                  </h4>
                  {canCreateResults && (
                    <button
                      onClick={() => setShowAddResultModal(true)}
                      className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                    >
                      <Plus className="h-4 w-4 mr-1" />
                      Agregar Resultado
                    </button>
                  )}
                </div>
                
                {loadingResults ? (
                  <div className="flex items-center justify-center py-8">
                    <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                    <span className="ml-2 text-sm text-gray-500">Cargando resultados...</span>
                  </div>
                ) : results.length === 0 ? (
                  <div className="text-center py-8 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
                    <FlaskConical className="mx-auto h-8 w-8 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">Sin resultados</h3>
                    <p className="mt-1 text-sm text-gray-500">
                      No hay resultados registrados para esta muestra.
                    </p>
                    {canCreateResults && (
                      <div className="mt-4">
                        <button
                          onClick={() => setShowAddResultModal(true)}
                          className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md text-green-700 bg-green-100 hover:bg-green-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                        >
                          <Plus className="h-4 w-4 mr-2" />
                          Agregar Primer Resultado
                        </button>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3">
                    {results.map((result) => {
                      const getStatusIcon = (status: string) => {
                        switch (status) {
                          case 'pending':
                            return <Clock className="h-4 w-4 text-yellow-500" />
                          case 'completed':
                            return <CheckCircle className="h-4 w-4 text-blue-500" />
                          case 'validated':
                            return <CheckCircle className="h-4 w-4 text-green-500" />
                          default:
                            return <AlertCircle className="h-4 w-4 text-gray-400" />
                        }
                      }

                      const getStatusText = (status: string) => {
                        switch (status) {
                          case 'pending':
                            return 'Pendiente'
                          case 'completed':
                            return 'Completado'
                          case 'validated':
                            return 'Validado'
                          default:
                            return status
                        }
                      }

                      const getResultTypeColor = (resultType: string | null) => {
                        switch (resultType) {
                          case 'positive':
                            return 'bg-red-100 text-red-800'
                          case 'negative':
                            return 'bg-green-100 text-green-800'
                          case 'inconclusive':
                            return 'bg-gray-100 text-gray-800'
                          default:
                            return 'bg-gray-100 text-gray-800'
                        }
                      }

                      const getResultTypeText = (resultType: string | null) => {
                        switch (resultType) {
                          case 'positive':
                            return 'Positivo'
                          case 'negative':
                            return 'Negativo'
                          case 'inconclusive':
                            return 'No conclusivo'
                          default:
                            return 'N/A'
                        }
                      }

                      return (
                        <div key={result.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-3 mb-2">
                                {getStatusIcon(result.status || '')}
                                <span className="text-sm font-medium text-gray-900">
                                  {getStatusText(result.status || '')}
                                </span>
                                {result.result_type && (
                                  <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium ${getResultTypeColor(result.result_type)}`}>
                                    {getResultTypeText(result.result_type)}
                                  </span>
                                )}
                                <span className="text-xs text-gray-500 capitalize">
                                  {result.test_area?.replace('_', ' ')}
                                </span>
                              </div>
                              
                              {result.pathogen_identified && (
                                <p className="text-sm text-gray-700 mb-1">
                                  <span className="font-medium">Patógeno:</span> {result.pathogen_identified}
                                </p>
                              )}
                              
                              {result.diagnosis && (
                                <p className="text-sm text-gray-700 mb-1 line-clamp-2">
                                  <span className="font-medium">Diagnóstico:</span> {result.diagnosis}
                                </p>
                              )}
                              
                              <div className="flex items-center text-xs text-gray-500 space-x-4 mt-2">
                                <span>
                                  Realizado: {new Date(result.performed_at || '').toLocaleDateString()}
                                </span>
                                {result.validation_date && (
                                  <span>
                                    Validado: {new Date(result.validation_date || '').toLocaleDateString()}
                                  </span>
                                )}
                              </div>
                            </div>
                            
                            <div className="flex items-center ml-4">
                              <button
                                onClick={() => {
                                  setSelectedResultId(result.id)
                                  setShowViewResultModal(true)
                                }}
                                className="text-green-600 hover:text-green-800 p-1"
                                title="Ver detalles"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                )}
              </div>

              {/* Notes */}
              <div className="sm:col-span-2 lg:col-span-3">
                <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Notas y observaciones</h4>
              </div>

              <div className="sm:col-span-1 lg:col-span-1">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas del cliente</label>
                <p className="text-sm text-gray-900">{sample.client_notes || 'Sin notas'}</p>
              </div>

              <div className="sm:col-span-2 lg:col-span-2">
                <label className="block text-sm font-medium text-gray-700 mb-1">Notas de recepción</label>
                <p className="text-sm text-gray-900">{sample.reception_notes || 'Sin notas'}</p>
              </div>
            </div>
          </div>

          <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
            <button
              type="button"
              onClick={onClose}
              className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto sm:text-sm"
            >
              Cerrar
            </button>
          </div>
        </div>
      </div>

      {/* Results Modals */}
      <ViewResultModal
        isOpen={showViewResultModal}
        onClose={() => {
          setShowViewResultModal(false)
          setSelectedResultId(null)
        }}
        resultId={selectedResultId}
      />

      <AddResultModal
        isOpen={showAddResultModal}
        onClose={() => setShowAddResultModal(false)}
        onSuccess={() => {
          fetchResults()
          setShowAddResultModal(false)
        }}
        preselectedSampleId={sample.id}
      />
    </div>
  )
}