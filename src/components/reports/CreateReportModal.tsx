'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/contexts/AuthContext'
import { X, Search, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Client } from '@/types/database'
import { getAnalysisTypeFromTestArea, getAllAnalysisTypesFromTestArea, ANALYSIS_TYPE_REGISTRY } from '@/config/analysisTypes'

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
  const [typeSelections, setTypeSelections] = useState<Record<string, string>>({})
  const [dbAnalysisTypes, setDbAnalysisTypes] = useState<Array<{ key: string; label: string; db_areas: string[] }>>([])

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
      setTypeSelections({})
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

        const firstResult = results.find(r => resultIds.includes(r.id))

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
            analysis_type: selectedType
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
      alert('Error al crear el informe. Por favor, intente nuevamente.')
    } finally {
      setIsCreating(false)
    }
  }

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (client.rut && client.rut.toLowerCase().includes(searchTerm.toLowerCase()))
  )

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-gray-500 bg-opacity-75 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-medium text-gray-900">Crear Nuevo Informe</h3>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-500"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="px-6 py-4 overflow-y-auto" style={{ maxHeight: 'calc(90vh - 140px)' }}>
          {/* Client Selection */}
          <div className="mb-6">
            <h4 className="text-sm font-medium text-gray-900 mb-3">Seleccionar Cliente</h4>
            
            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por nombre o RUT..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>

            {/* Clients List */}
            <div className="border border-gray-200 rounded-lg max-h-48 overflow-y-auto">
              {isLoadingClients ? (
                <div className="p-4 text-center">
                  <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
                </div>
              ) : filteredClients.length === 0 ? (
                <div className="p-4 text-center text-gray-500">
                  No se encontraron clientes
                </div>
              ) : (
                <div className="divide-y divide-gray-200">
                  {filteredClients.map((client) => (
                    <button
                      key={client.id}
                      onClick={() => {
                        setSelectedClient(client.id)
                        setSelectedResults([]) // Clear results when changing client
                      }}
                      className={`w-full px-4 py-3 text-left hover:bg-gray-50 transition-colors ${
                        selectedClient === client.id ? 'bg-indigo-50' : ''
                      }`}
                    >
                      <div className="font-medium text-gray-900">{client.name}</div>
                      {client.rut && (
                        <div className="text-sm text-gray-500">RUT: {client.rut}</div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Results Selection */}
          {selectedClient && (
            <div>
              <h4 className="text-sm font-medium text-gray-900 mb-3">Seleccionar Resultados</h4>
              
              {isLoadingResults ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center">
                    <Loader2 className="h-5 w-5 animate-spin text-gray-400 mx-auto" />
                  </div>
                </div>
              ) : results.length === 0 ? (
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="text-center text-gray-500">
                    No hay resultados validados disponibles para este cliente
                  </div>
                </div>
              ) : (
                <div className="border border-gray-200 rounded-lg max-h-64 overflow-y-auto">
                  <div className="divide-y divide-gray-200">
                    {results.map((result) => (
                      <div
                        key={result.id}
                        className="px-4 py-3 hover:bg-gray-50 transition-colors"
                      >
                        <label className="flex items-start cursor-pointer">
                          <div className="mt-0.5">
                            <button
                              type="button"
                              onClick={() => toggleResultSelection(result.id)}
                              className="text-indigo-600"
                            >
                              {selectedResults.includes(result.id) ? (
                                <CheckSquare className="h-5 w-5" />
                              ) : (
                                <Square className="h-5 w-5" />
                              )}
                            </button>
                          </div>
                          <div className="ml-3 flex-1">
                            <div className="font-medium text-gray-900">
                              Muestra: {result.samples?.code || 'N/A'}
                              {!result.samples && <span className="text-red-500 text-xs ml-2">(No sample data)</span>}
                            </div>
                            <div className="text-sm text-gray-500">
                              {result.samples?.species} {result.samples?.variety && `- ${result.samples.variety}`}
                            </div>
                            <div className="text-sm text-gray-500 mt-1">
                              Área: {result.test_area || 'N/A'} | 
                              Patógeno: {result.pathogen_identified || 'N/A'} | 
                              Severidad: {result.severity || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {new Date(result.created_at).toLocaleDateString('es-ES')}
                            </div>
                          </div>
                        </label>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              
              {selectedResults.length > 0 && (
                <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                  <div className="text-sm text-blue-800">
                    <strong>{selectedResults.length} resultado(s) seleccionado(s)</strong>
                  </div>
                  <div className="text-xs text-blue-600 mt-1">
                    {(() => {
                      const selectedTestAreas = [...new Set(
                        results
                          .filter(r => selectedResults.includes(r.id))
                          .map(r => r.test_area)
                          .filter(Boolean)
                      )]
                      if (selectedTestAreas.length === 1) {
                        return `Tipo de análisis: ${selectedTestAreas[0]}`
                      } else if (selectedTestAreas.length > 1) {
                        return `Tipos de análisis: ${selectedTestAreas.join(', ')} (se generarán ${selectedTestAreas.length} PDFs separados)`
                      }
                      return 'Tipo de análisis: N/A'
                    })()}
                  </div>
                </div>
              )}

              {/* Type selectors for ambiguous test areas */}
              {selectedResults.length > 0 && (() => {
                const groups = groupResultsByTestArea()
                const ambiguousAreas = Array.from(groups.keys()).filter(area => {
                  const types = getAvailableTypesForArea(area)
                  return types.length > 1
                })

                if (ambiguousAreas.length === 0) return null

                return (
                  <div className="mt-3 space-y-3">
                    {ambiguousAreas.map(area => {
                      const types = getAvailableTypesForArea(area)
                      const count = (groups.get(area) || []).length
                      return (
                        <div key={area} className="p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                          <label className="block text-sm font-medium text-yellow-800 mb-2">
                            Formato para "{area}" ({count} resultado(s)):
                          </label>
                          <select
                            value={typeSelections[area] || ''}
                            onChange={(e) => setTypeSelections(prev => ({ ...prev, [area]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 text-sm"
                          >
                            <option value="">Seleccionar formato...</option>
                            {types.map(t => (
                              <option key={t.key} value={t.key}>{t.label}</option>
                            ))}
                          </select>
                        </div>
                      )
                    })}
                  </div>
                )
              })()}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-end space-x-3">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
            >
              Cancelar
            </button>
            <button
              onClick={handleCreateReport}
              disabled={!selectedClient || selectedResults.length === 0 || isCreating}
              className={`px-4 py-2 text-sm font-medium text-white rounded-lg flex items-center space-x-2 ${
                !selectedClient || selectedResults.length === 0 || isCreating
                  ? 'bg-gray-300 cursor-not-allowed'
                  : 'bg-indigo-600 hover:bg-indigo-700'
              }`}
            >
              {isCreating ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Creando...</span>
                </>
              ) : (
                <span>Crear Informe</span>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}