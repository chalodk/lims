'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/contexts/AuthContext'
import { X, Search, CheckSquare, Square, Loader2 } from 'lucide-react'
import { Client } from '@/types/database'

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
  
  const supabase = createClient()

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
      const { data, error } = await supabase
        .from('results')
        .select(`
          id,
          created_at,
          status,
          test_area,
          pathogen_identified,
          severity,
          samples!inner (
            id,
            code,
            species,
            variety,
            client_id
          )
        `)
        .eq('samples.client_id', selectedClient)
        .eq('status', 'validated')
        .is('report_id', null)
        .order('created_at', { ascending: false })

      if (error) throw error
      
      // Transform the data to match our expected type
      const transformedData = (data || []).map(item => ({
        ...item,
        samples: item.samples ? item.samples[0] : null
      }))
      
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
    } else {
      // Reset state when modal closes
      setSelectedClient(null)
      setSelectedResults([])
      setResults([])
      setSearchTerm('')
    }
  }, [isOpen, fetchClients])

  useEffect(() => {
    if (selectedClient) {
      fetchClientResults()
    }
  }, [selectedClient, fetchClientResults])

  const toggleResultSelection = (resultId: string) => {
    setSelectedResults(prev =>
      prev.includes(resultId)
        ? prev.filter(id => id !== resultId)
        : [...prev, resultId]
    )
  }

  const handleCreateReport = async () => {
    if (!selectedClient || selectedResults.length === 0) return

    setIsCreating(true)
    try {
      // Create the report
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
          test_areas: [...new Set(results
            .filter(r => selectedResults.includes(r.id))
            .map(r => r.test_area)
            .filter(Boolean)
          )]
        })
        .select()
        .single()

      if (reportError) throw reportError

      // Create PDF in PDFMonkey using the first selected result
      try {
        const firstResultId = selectedResults[0]
        if (firstResultId) {
          await fetch('/api/reports/pdfmonkey', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              result_id: firstResultId,
              report_id: reportData.id 
            })
          })
        }
      } catch (e) {
        console.error('Failed to request PDF creation:', e)
      }

      // Update results to link them to the report
      const { error: updateError } = await supabase
        .from('results')
        .update({ report_id: reportData.id })
        .in('id', selectedResults)

      if (updateError) throw updateError

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
                      onClick={() => setSelectedClient(client.id)}
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
                              Muestra: {result.samples?.code}
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
                <div className="mt-3 text-sm text-gray-600">
                  {selectedResults.length} resultado(s) seleccionado(s)
                </div>
              )}
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