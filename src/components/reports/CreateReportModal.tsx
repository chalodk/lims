'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/contexts/AuthContext'
import { Search, CheckSquare, Square, Loader2, FileText, ImagePlus, X } from 'lucide-react'
import { Client } from '@/types/database'
import {
  getAllAnalysisTypesFromTestArea,
  ANALYSIS_TYPE_REGISTRY,
} from '@/config/analysisTypes'
import {
  MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE,
  PHYTOPATHOLOGY_ISOLATION_ANALYSIS_TYPE,
  resolvePhytopathologyReportVariant,
  TISSUE_ISOLATION_TABLE_FORMAT,
} from '@/lib/results/phytopathologyFindings'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormSection, Field } from '@/components/ui/form-section'
import { fieldClassName } from '@/components/ui/form-field-styles'
import { cn } from '@/lib/utils'
import { MAX_REPORT_IMAGES } from '@/lib/reports/reportImages'

type SelectedReportImage = {
  id: string
  file: File
  previewUrl: string
}

function revokeReportImagePreviews(images: SelectedReportImage[]) {
  images.forEach((image) => URL.revokeObjectURL(image.previewUrl))
}

interface CreateReportModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateReportModal({ isOpen, onClose, onSuccess }: CreateReportModalProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [selectedClient, setSelectedClient] = useState<string | null>(null)
  const [results, setResults] = useState<{
    id: string
    created_at: string
    status: string
    test_area: string | null
    pathogen_identified: string | null
    severity: string | null
    findings?: unknown
    samples: {
      id: string
      code: string
      species: string
      variety: string | null
      client_id: string
    } | null
  }[]>([])
  const [selectedResults, setSelectedResults] = useState<string[]>([])
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [isLoadingResults, setIsLoadingResults] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [searchTerm, setSearchTerm] = useState('')
  const [isClientSectionCollapsed, setIsClientSectionCollapsed] = useState(false)
  const [typeSelections, setTypeSelections] = useState<Record<string, string>>({})
  const [reportImages, setReportImages] = useState<SelectedReportImage[]>([])
  const [dbAnalysisTypes, setDbAnalysisTypes] = useState<Array<{ key: string; label: string; db_areas: string[] }>>([])
  const reportImagesInputRef = useRef<HTMLInputElement>(null)

  const supabase = getSupabaseClient()

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true)
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name')

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoadingClients(false)
    }
  }, [supabase])

  const fetchClientResults = useCallback(async () => {
    setIsLoadingResults(true)
    try {
      // First, get sample IDs for the selected client
      const { data: samplesData, error: samplesError } = await supabase
        .from('samples')
        .select('id')
        .eq('client_id', selectedClient)

      if (samplesError) throw samplesError
      
      const sampleIds = samplesData?.map(s => s.id) || []
      console.log('Sample IDs for client:', sampleIds)

      if (sampleIds.length === 0) {
        setResults([])
        return
      }

      // Then, get results for those samples
      const { data, error } = await supabase
        .from('results')
        .select(`
          *,
          samples (
            id,
            code,
            species,
            variety,
            client_id,
            clients (id, name)
          )
        `)
        .in('sample_id', sampleIds)
        .eq('status', 'validated')
        .is('report_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      console.log('Raw results data:', data)
      
      // Transform the data to match our expected type
      const transformedData = (data || []).map(item => {
        console.log('Processing item:', item, 'samples:', item.samples)
        return {
          ...item,
          samples: item.samples || null
        }
      })
      
      console.log('Transformed results data:', transformedData)
      setResults(transformedData)
    } catch (error) {
      console.error('Error fetching results:', error)
    } finally {
      setIsLoadingResults(false)
    }
  }, [selectedClient, supabase])

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetch('/api/admin/analysis-types')
        .then(r => r.ok ? r.json() : Promise.reject())
        .then(data => setDbAnalysisTypes((data.analysis_types || []).filter((t: { active?: boolean }) => t.active !== false)))
        .catch(() => {})
    } else {
      // Reset state when modal closes
      setSelectedClient(null)
      setSelectedResults([])
      setResults([])
      setSearchTerm('')
      setIsClientSectionCollapsed(false)
      setTypeSelections({})
      setReportImages((currentImages) => {
        revokeReportImagePreviews(currentImages)
        return []
      })
    }
  }, [isOpen, fetchClients])

  useEffect(() => {
    if (selectedClient) {
      fetchClientResults()
    }
  }, [selectedClient, fetchClientResults])

  const toggleResultSelection = (resultId: string) => {
    const result = results.find(r => r.id === resultId)
    if (!result) return

    setSelectedResults(prev => {
      if (prev.includes(resultId)) {
        // Removing result - no validation needed
        return prev.filter(id => id !== resultId)
      } else {
        // Adding result - check validations
        if (prev.length === 0) {
          // First selection - always allowed
          return [...prev, resultId]
        } else {
          // Check if the new result has the same client as existing selections
          const existingResult = results.find(r => prev.includes(r.id))
          if (existingResult) {
            const existingClientId = existingResult.samples?.client_id
            const newClientId = result.samples?.client_id
            if (existingClientId && newClientId && existingClientId !== newClientId) {
              alert(`No se pueden mezclar resultados de diferentes clientes. Todos los resultados deben ser del mismo cliente.`)
              return prev
            }
          }
          // ✅ Allow different analysis types - backend will generate separate PDFs
          return [...prev, resultId]
        }
      }
    })
  }

  /**
   * Retorna los tipos de analisis disponibles para un test_area,
   * combinando el registro estatico con los tipos en BD.
   */
  const getAvailableTypesForArea = (testArea: string): Array<{ key: string; label: string }> => {
    const seen = new Set<string>()
    const result: Array<{ key: string; label: string }> = []

    // DB types first (custom types take priority in display order)
    for (const t of dbAnalysisTypes) {
      if (t.db_areas?.includes(testArea) && !seen.has(t.key)) {
        seen.add(t.key)
        result.push({ key: t.key, label: t.label })
      }
    }

    // Static types as fallback
    const staticKeys = getAllAnalysisTypesFromTestArea(testArea)
    for (const key of staticKeys) {
      if (key !== 'default' && !seen.has(key)) {
        seen.add(key)
        result.push({ key, label: ANALYSIS_TYPE_REGISTRY[key]?.label || key })
      }
    }

    return result
  }

  /**
   * Groups selected results by their raw test_area.
   * If multiple analysis types exist for an area, the user picks via typeSelections.
   */
  const groupResultsByTestArea = (): Map<string, string[]> => {
    const groups = new Map<string, string[]>()

    selectedResults.forEach(resultId => {
      const result = results.find(r => r.id === resultId)
      if (!result) return

      const testArea = result.test_area || 'default'

      if (!groups.has(testArea)) {
        groups.set(testArea, [])
      }

      groups.get(testArea)!.push(resultId)
    })

    return groups
  }

  const handleCreateReport = async () => {
    if (!selectedClient || selectedResults.length === 0) return

    setIsCreating(true)
    try {
      const groupsByTestArea = groupResultsByTestArea()
      console.log('Grouped results by test_area:', Array.from(groupsByTestArea.entries()).map(([area, ids]) => ({ area, count: ids.length })))

      const createdReports = []

      for (const [testArea, resultIds] of groupsByTestArea.entries()) {
        // Determine the analysis type for this group
        const availableTypes = getAvailableTypesForArea(testArea)
        const selectedType = typeSelections[testArea] || (availableTypes.length === 1 ? availableTypes[0].key : null)

        if (!selectedType) {
          alert(`Por favor seleccione un formato para "${testArea}"`)
          setIsCreating(false)
          return
        }

        const groupedResults = resultIds
          .map((resultId) => results.find((result) => result.id === resultId))
          .filter((result): result is NonNullable<typeof result> => Boolean(result))
        const tableVariant = resolvePhytopathologyReportVariant(groupedResults)
        if (tableVariant === 'mixed') {
          alert(MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE)
          setIsCreating(false)
          return
        }
        const analysisType =
          tableVariant === TISSUE_ISOLATION_TABLE_FORMAT
            ? PHYTOPATHOLOGY_ISOLATION_ANALYSIS_TYPE
            : selectedType

        const { data: reportData, error: reportError } = await supabase
          .from('reports')
          .insert({
            client_id: selectedClient,
            company_id: user?.company_id,
            generated_by: user?.id,
            responsible_id: user?.id,
            status: 'draft',
            template: 'standard',
            include_recommendations: true,
            include_images: true,
            test_areas: [testArea],
            analysis_type: analysisType
          })
          .select()
          .single()

        if (reportError) {
          console.error(`Error creating report for ${testArea}:`, reportError)
          throw reportError
        }

        if (resultIds.length > 0) {
          const { error: updateError } = await supabase
            .from('results')
            .update({ report_id: reportData.id })
            .in('id', resultIds)

          if (updateError) {
            console.error(`Error associating results for ${testArea}:`, updateError)
            throw updateError
          }
        }

        if (groupsByTestArea.size === 1 && reportImages.length > 0) {
          const imageFormData = new FormData()
          reportImages.forEach((image) => imageFormData.append('images', image.file))

          const uploadResponse = await fetch(`/api/reports/${reportData.id}/images`, {
            method: 'POST',
            body: imageFormData,
          })

          if (!uploadResponse.ok) {
            const uploadBody = await uploadResponse.json().catch(() => null)
            const rollbackResponse = await fetch(`/api/reports/delete/${reportData.id}`, {
              method: 'DELETE',
            }).catch((rollbackError) => {
              console.error('Error rolling back report after image upload failed:', rollbackError)
              return null
            })

            if (!rollbackResponse?.ok) {
              await supabase.from('results').update({ report_id: null }).eq('report_id', reportData.id)
              await supabase.from('reports').delete().eq('id', reportData.id)
            }

            throw new Error(
              uploadBody?.error || 'No se pudieron subir las imágenes del informe'
            )
          }
        }

        try {
          await fetch('/api/reports/pdfmonkey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              result_ids: resultIds,
              report_id: reportData.id
            })
          })
        } catch (e) {
          console.error(`Failed to request PDF creation for ${testArea}:`, e)
        }

        createdReports.push(reportData)
      }

      console.log(`Successfully created ${createdReports.length} report(s)`)

      onSuccess()
      onClose()
    } catch (error) {
      console.error('Error creating report:', error)
      const uploadMessage =
        error instanceof Error && error.message.includes('imágenes') ? error.message : null
      alert(uploadMessage || 'Error al crear el informe. Por favor, intente nuevamente.')
    } finally {
      setIsCreating(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.rut && client.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  const selectedClientRecord = clients.find((client) => client.id === selectedClient)
  const showCollapsedClient = Boolean(selectedClientRecord) && isClientSectionCollapsed

  const selectClient = (clientId: string) => {
    setSelectedClient(clientId)
    setSelectedResults([])
    setSearchTerm('')
    setIsClientSectionCollapsed(true)
  }

  const addReportImages = (fileList: FileList | null) => {
    if (!fileList) return

    const incomingImages = Array.from(fileList).filter((file) => file.type.startsWith('image/'))

    setReportImages((currentImages) => {
      const remainingSlots = MAX_REPORT_IMAGES - currentImages.length
      if (remainingSlots <= 0) return currentImages

      const acceptedImages = incomingImages.slice(0, remainingSlots).map((file) => ({
        id: crypto.randomUUID(),
        file,
        previewUrl: URL.createObjectURL(file),
      }))

      return [...currentImages, ...acceptedImages]
    })

    if (reportImagesInputRef.current) {
      reportImagesInputRef.current.value = ''
    }
  }

  const removeReportImage = (imageId: string) => {
    setReportImages((currentImages) => {
      const removedImage = currentImages.find((image) => image.id === imageId)
      if (removedImage) URL.revokeObjectURL(removedImage.previewUrl)
      return currentImages.filter((image) => image.id !== imageId)
    })
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isCreating) {
      onClose()
    }
  }

  const groupsByArea = selectedResults.length > 0 ? groupResultsByTestArea() : new Map<string, string[]>()
  const selectedTestAreas = [...new Set(
    results
      .filter((r) => selectedResults.includes(r.id))
      .map((r) => r.test_area)
      .filter(Boolean)
  )]
  const ambiguousAreas = Array.from(groupsByArea.keys()).filter((area) => {
    const types = getAvailableTypesForArea(area)
    return types.length > 1
  })
  const hasSingleAnalysisType = selectedTestAreas.length === 1
  const canAddReportImages = reportImages.length < MAX_REPORT_IMAGES

  useEffect(() => {
    if (hasSingleAnalysisType) return

    setReportImages((currentImages) => {
      if (currentImages.length === 0) return currentImages
      revokeReportImagePreviews(currentImages)
      return []
    })
  }, [hasSingleAnalysisType])

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isCreating}
        className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl"
        onInteractOutside={(event) => {
          if (isCreating) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isCreating) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <FileText className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Crear nuevo informe</DialogTitle>
              <DialogDescription className="mt-1">
                Selecciona cliente, resultados y formato. Se generará un PDF por tipo de análisis.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          {showCollapsedClient && selectedClientRecord ? (
            <section className="flex items-center gap-3 rounded-xl border border-gray-100 bg-gray-50/60 px-4 py-3 sm:px-5">
              <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-green-100 text-xs font-semibold text-green-700">
                1
              </span>
              <div className="min-w-0 flex-1">
                <h4 className="text-xs font-medium text-muted-foreground">Cliente</h4>
                <p className="truncate text-sm font-semibold text-gray-900">
                  {selectedClientRecord.name}
                </p>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => setIsClientSectionCollapsed(false)}
              >
                Cambiar
              </Button>
            </section>
          ) : (
            <FormSection
              step={1}
              title="Cliente"
              description="Cliente al que pertenecen las muestras del informe"
            >
              <Field label="Buscar cliente">
                <div className="relative">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Buscar por nombre o RUT..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className={cn(fieldClassName, 'pl-9')}
                  />
                </div>
              </Field>

              <div className="mt-3 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {isLoadingClients ? (
                  <div className="p-4 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </div>
                ) : filteredClients.length === 0 ? (
                  <div className="p-4 text-center text-sm text-muted-foreground">
                    No se encontraron clientes
                  </div>
                ) : (
                  <div className="divide-y divide-gray-100">
                    {filteredClients.map((client) => (
                      <button
                        key={client.id}
                        type="button"
                        onClick={() => selectClient(client.id)}
                        className={cn(
                          'w-full px-4 py-3 text-left transition-colors hover:bg-gray-50',
                          selectedClient === client.id && 'bg-green-50'
                        )}
                      >
                        <div className="font-medium text-foreground">{client.name}</div>
                        {client.rut && (
                          <div className="text-sm text-muted-foreground">RUT: {client.rut}</div>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </FormSection>
          )}

          {selectedClient && (
            <FormSection
              step={2}
              title="Resultados"
              description="Resultados validados aún no asociados a un informe"
            >
              {isLoadingResults ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center">
                  <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                </div>
              ) : results.length === 0 ? (
                <div className="rounded-lg border border-gray-200 bg-white p-4 text-center text-sm text-muted-foreground">
                  No hay resultados validados disponibles para este cliente
                </div>
              ) : (
                <div className="max-h-64 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                  <div className="divide-y divide-gray-100">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="px-4 py-3 transition-colors hover:bg-gray-50"
                      >
                        <label className="flex cursor-pointer items-start">
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleResultSelection(result.id)}
                              className="text-green-700"
                            >
                              {selectedResults.includes(result.id) ? (
                                <CheckSquare className="h-5 w-5" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-foreground">
                              Muestra: {result.samples?.code || 'N/A'}
                              {!result.samples && (
                                <span className="ml-2 text-xs text-red-500">
                                  (No sample data)
                                </span>
                              )}
                            </div>
                            <div className="text-sm text-muted-foreground">
                              {result.samples?.species}{' '}
                              {result.samples?.variety && `- ${result.samples.variety}`}
                            </div>
                            <div className="mt-1 text-sm text-muted-foreground">
                              Área: {result.test_area || 'N/A'} | Patógeno:{' '}
                              {result.pathogen_identified || 'N/A'} | Severidad:{' '}
                              {result.severity || 'N/A'}
                            </div>
                            <div className="mt-1 text-xs text-muted-foreground">
                              {new Date(result.created_at).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </FormSection>
          )}

          {selectedClient && selectedResults.length > 0 && (
            <FormSection
              step={3}
              title="Formato y resumen"
              description="Confirma el contenido y el formato del informe a generar"
            >
              <div className="rounded-lg border border-green-200 bg-green-50 p-3">
                <div className="text-sm text-green-800">
                  <strong>{selectedResults.length} resultado(s) seleccionado(s)</strong>
                </div>
                <div className="mt-1 text-xs text-green-700">
                  {selectedTestAreas.length === 1
                    ? `Tipo de análisis: ${selectedTestAreas[0]}`
                    : selectedTestAreas.length > 1
                      ? `Tipos de análisis: ${selectedTestAreas.join(', ')} (se generarán ${selectedTestAreas.length} PDFs separados)`
                      : 'Tipo de análisis: N/A'}
                </div>
              </div>

              {hasSingleAnalysisType && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap items-center gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      disabled={isCreating || !canAddReportImages}
                      onClick={() => reportImagesInputRef.current?.click()}
                      className="gap-2"
                    >
                      <ImagePlus className="h-4 w-4" />
                      Agregar imágenes
                    </Button>
                    <span className="text-xs text-muted-foreground">máximo 3 imágenes</span>
                  </div>
                  <input
                    ref={reportImagesInputRef}
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    multiple
                    className="hidden"
                    onChange={(event) => addReportImages(event.target.files)}
                  />
                  {reportImages.length > 0 && (
                    <ul className="grid grid-cols-3 gap-3">
                      {reportImages.map((image) => (
                        <li
                          key={image.id}
                          className="relative overflow-hidden rounded-lg border border-gray-200 bg-white"
                        >
                          {/* blob preview; next/image does not support object URLs */}
                          <img
                            src={image.previewUrl}
                            alt={image.file.name}
                            className="h-24 w-full object-cover"
                          />
                          <button
                            type="button"
                            onClick={() => removeReportImage(image.id)}
                            disabled={isCreating}
                            aria-label={`Quitar ${image.file.name}`}
                            className="absolute right-1.5 top-1.5 flex h-6 w-6 items-center justify-center rounded-full bg-white text-gray-700 shadow-sm hover:bg-gray-50"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              )}

              {ambiguousAreas.length > 0 && (
                <div className="mt-3 space-y-3">
                  {ambiguousAreas.map((area) => {
                    const types = getAvailableTypesForArea(area)
                    const count = (groupsByArea.get(area) || []).length
                    return (
                      <Field
                        key={area}
                        label={`Formato para “${area}” (${count} resultado(s))`}
                        required
                      >
                        <select
                          value={typeSelections[area] || ''}
                          onChange={(e) =>
                            setTypeSelections((prev) => ({
                              ...prev,
                              [area]: e.target.value,
                            }))
                          }
                          className={fieldClassName}
                        >
                          <option value="">Seleccionar formato...</option>
                          {types.map((t) => (
                            <option key={t.key} value={t.key}>
                              {t.label}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )
                  })}
                </div>
              )}
            </FormSection>
          )}
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isCreating}
            onClick={onClose}
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleCreateReport}
            disabled={!selectedClient || selectedResults.length === 0 || isCreating}
            className="gap-2"
          >
            {isCreating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Creando...
              </>
            ) : (
              'Crear informe'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
