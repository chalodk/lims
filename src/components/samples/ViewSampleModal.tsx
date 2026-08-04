'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, ResultWithRelations } from '@/types/database'
import ViewResultModal from '@/components/results/ViewResultModal'
import AddResultModal from '@/components/results/AddResultModal'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { FormSection, ReadOnlyField } from '@/components/ui/form-section'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import {
  TestTube,
  FlaskConical,
  Plus,
  Eye,
  CheckCircle,
  Clock,
  AlertCircle,
  Loader2,
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

  const canCreateResults = userRole && ['admin', 'validador', 'comun'].includes(userRole)

  const formatDate = (date: string) => {
    return new Date(date).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    })
  }

  // Extract test information from sample_tests relationship
  const getTestInfo = () => {
    if (!sample.sample_tests || !Array.isArray(sample.sample_tests)) {
      return {
        analysisTypes: ['No especificado'],
        methodologies: ['No especificado'],
        identificationTechniques: ['No especificado'],
      }
    }

    const analysisTypes = sample.sample_tests
      .map((st) => st.test_catalog?.area)
      .filter(Boolean)
      .filter((area, index, arr) => arr.indexOf(area) === index)

    const methodologies = sample.sample_tests
      .map((st) => st.methods?.name)
      .filter(Boolean)
      .filter((method, index, arr) => arr.indexOf(method) === index)

    const testNames = sample.sample_tests
      .map((st) => st.test_catalog?.name)
      .filter(Boolean)

    return {
      analysisTypes: analysisTypes.length > 0 ? analysisTypes : ['No especificado'],
      methodologies: methodologies.length > 0 ? methodologies : ['No especificado'],
      identificationTechniques: testNames.length > 0 ? testNames : ['No especificado'],
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
      completed: 'Completada',
    }
    return statusLabels[status as keyof typeof statusLabels] || status
  }

  const getSlaTypeLabel = (slaType: string) => {
    const slaTypeLabels = {
      normal: 'Normal',
      express: 'Express',
    }
    return slaTypeLabels[slaType as keyof typeof slaTypeLabels] || slaType
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !showAddResultModal && !showViewResultModal) {
      onClose()
    }
  }

  const greenBadgeClassName = 'bg-green-100 text-green-800 border-transparent'

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          onInteractOutside={(event) => {
            if (showAddResultModal || showViewResultModal) {
              event.preventDefault()
            }
          }}
          onEscapeKeyDown={(event) => {
            if (showAddResultModal || showViewResultModal) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader className="border-b border-gray-100 bg-white">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <TestTube className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <DialogTitle>Detalles de la Muestra</DialogTitle>
                <DialogDescription className="mt-1">
                  Código: {sample.code}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            <FormSection
              step={1}
              title="Identificación"
              description="Datos de registro y estado de la muestra"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField label="Código" value={sample.code} />
                <ReadOnlyField
                  label="Estado"
                  value={getStatusLabel(sample.status || '')}
                />
                <ReadOnlyField
                  label="Prioridad"
                  value={getSlaTypeLabel(sample.sla_type || '')}
                />
                <ReadOnlyField label="Especie" value={sample.species} />
                <ReadOnlyField
                  label="Variedad"
                  value={sample.variety || 'No especificada'}
                />
                <ReadOnlyField
                  label="Fecha de recepción"
                  value={formatDate(sample.received_date)}
                />
                {sample.clients?.name ? (
                  <ReadOnlyField
                    label="Cliente"
                    value={sample.clients.name}
                    className="sm:col-span-2"
                  />
                ) : null}
              </div>
            </FormSection>

            <FormSection
              step={2}
              title="Material / agrícola"
              description="Contexto del cultivo y material analizado"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField
                  label="Año de plantación"
                  value={sample.planting_year || 'No especificado'}
                />
                <ReadOnlyField
                  label="Cultivo anterior"
                  value={sample.previous_crop || 'No especificado'}
                />
                <ReadOnlyField
                  label="Próximo cultivo"
                  value={sample.next_crop || 'No especificado'}
                />
                <ReadOnlyField
                  label="Terreno en barbecho"
                  value={sample.fallow ? 'Sí' : 'No'}
                />
                {sample.rootstock ? (
                  <ReadOnlyField label="Portainjerto" value={sample.rootstock} />
                ) : null}
                {sample.organo_analizado ? (
                  <ReadOnlyField
                    label="Órgano analizado"
                    value={sample.organo_analizado}
                  />
                ) : null}
              </div>
            </FormSection>

            <FormSection
              step={3}
              title="Muestreo"
              description="Quién tomó la muestra y cómo"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField
                  label="Recolectada por"
                  value={sample.taken_by === 'client' ? 'Cliente' : 'Laboratorio'}
                />
                <ReadOnlyField
                  label="Método de muestreo"
                  value={sample.sampling_method || 'No especificado'}
                />
              </div>
            </FormSection>

            <FormSection
              step={4}
              title="Análisis"
              description="Patógeno sospechoso y ensayos asociados"
            >
              <div className="space-y-4">
                <ReadOnlyField
                  label="Patógeno sospechoso"
                  value={sample.suspected_pathogen || 'No especificado'}
                />

                <ReadOnlyField
                  label="Tipo de análisis"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {parsedTests.analysisTypes.map((type) => (
                        <Badge key={type} className={greenBadgeClassName}>
                          {type}
                        </Badge>
                      ))}
                    </div>
                  }
                />

                <ReadOnlyField
                  label="Metodología"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {parsedTests.methodologies.map((methodology) => (
                        <Badge key={methodology} className={greenBadgeClassName}>
                          {methodology}
                        </Badge>
                      ))}
                    </div>
                  }
                />

                <ReadOnlyField
                  label="Técnica de identificación"
                  value={
                    <div className="flex flex-wrap gap-2">
                      {parsedTests.identificationTechniques.map((technique) => (
                        <Badge key={technique} className={greenBadgeClassName}>
                          {technique}
                        </Badge>
                      ))}
                    </div>
                  }
                />
              </div>
            </FormSection>

            <FormSection
              step={5}
              title={`Resultados (${results.length})`}
              description="Resultados registrados para esta muestra"
            >
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <FlaskConical className="h-4 w-4" />
                  <span>Historial de resultados</span>
                </div>
                {canCreateResults ? (
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="gap-1.5"
                    onClick={() => setShowAddResultModal(true)}
                  >
                    <Plus className="h-4 w-4" />
                    Agregar Resultado
                  </Button>
                ) : null}
              </div>

              {loadingResults ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
                  <span className="ml-2 text-sm text-gray-500">
                    Cargando resultados...
                  </span>
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-lg border border-dashed border-gray-200 bg-white py-8 text-center">
                  <FlaskConical className="mx-auto h-8 w-8 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">
                    Sin resultados
                  </h3>
                  <p className="mt-1 text-sm text-gray-500">
                    No hay resultados registrados para esta muestra.
                  </p>
                  {canCreateResults ? (
                    <div className="mt-4">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="gap-1.5"
                        onClick={() => setShowAddResultModal(true)}
                      >
                        <Plus className="h-4 w-4" />
                        Agregar Primer Resultado
                      </Button>
                    </div>
                  ) : null}
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
                          return 'bg-red-100 text-red-800 border-transparent'
                        case 'negative':
                          return 'bg-green-100 text-green-800 border-transparent'
                        case 'inconclusive':
                          return 'bg-gray-100 text-gray-800 border-transparent'
                        default:
                          return 'bg-gray-100 text-gray-800 border-transparent'
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
                      <div
                        key={result.id}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0 flex-1">
                            <div className="mb-2 flex flex-wrap items-center gap-2">
                              {getStatusIcon(result.status || '')}
                              <span className="text-sm font-medium text-gray-900">
                                {getStatusText(result.status || '')}
                              </span>
                              {result.result_type ? (
                                <Badge
                                  className={getResultTypeColor(result.result_type)}
                                >
                                  {getResultTypeText(result.result_type)}
                                </Badge>
                              ) : null}
                              <span className="text-xs capitalize text-gray-500">
                                {result.test_area?.replace('_', ' ')}
                              </span>
                            </div>

                            {result.pathogen_identified ? (
                              <p className="mb-1 text-sm text-gray-700">
                                <span className="font-medium">Patógeno:</span>{' '}
                                {result.pathogen_identified}
                              </p>
                            ) : null}

                            {result.diagnosis ? (
                              <p className="mb-1 line-clamp-2 text-sm text-gray-700">
                                <span className="font-medium">Diagnóstico:</span>{' '}
                                {result.diagnosis}
                              </p>
                            ) : null}

                            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-gray-500">
                              <span>
                                Realizado:{' '}
                                {new Date(
                                  result.performed_at || ''
                                ).toLocaleDateString()}
                              </span>
                              {result.validation_date ? (
                                <span>
                                  Validado:{' '}
                                  {new Date(
                                    result.validation_date || ''
                                  ).toLocaleDateString()}
                                </span>
                              ) : null}
                            </div>
                          </div>

                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            title="Ver detalles"
                            onClick={() => {
                              setSelectedResultId(result.id)
                              setShowViewResultModal(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </FormSection>

            <FormSection step={6} title="Notas" description="Observaciones registradas">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <ReadOnlyField
                  label="Notas del cliente"
                  value={sample.client_notes || 'Sin notas'}
                />
                <ReadOnlyField
                  label="Notas de recepción"
                  value={sample.reception_notes || 'Sin notas'}
                />
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={onClose}>
              Cerrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

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
    </>
  )
}
