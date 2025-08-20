'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, SampleTest, TestCatalog, Method } from '@/types/database'
import { 
  FlaskConical,
  X,
  Loader2,
  TestTube
} from 'lucide-react'

interface AddResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  preselectedSampleId?: string
}

export default function AddResultModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  preselectedSampleId 
}: AddResultModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [samples, setSamples] = useState<SampleWithClient[]>([])
  const [sampleTests, setSampleTests] = useState<(SampleTest & { test_catalog?: TestCatalog, methods?: Method })[]>([])
  const [loadingSamples, setLoadingSamples] = useState(false)
  const [loadingTests, setLoadingTests] = useState(false)
  
  const [formData, setFormData] = useState({
    sample_id: preselectedSampleId || '',
    sample_test_id: '',
    methodology: '',
    findings: '',
    conclusion: '',
    diagnosis: '',
    pathogen_identified: '',
    pathogen_type: '',
    severity: '',
    confidence: '',
    result_type: '',
    recommendations: ''
  })

  const supabase = createClient()

  const fetchSamples = useCallback(async () => {
    if (!user?.company_id) return

    try {
      setLoadingSamples(true)
      const { data, error } = await supabase
        .from('samples')
        .select(`
          *,
          clients (id, name),
          sample_tests (
            id,
            test_catalog (id, name, area),
            methods (id, name)
          )
        `)
        .eq('company_id', user.company_id)
        .in('status', ['received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis'])
        .order('received_date', { ascending: false })

      if (error) throw error
      setSamples(data || [])
    } catch (error) {
      console.error('Error fetching samples:', error)
      setSamples([])
    } finally {
      setLoadingSamples(false)
    }
  }, [supabase, user?.company_id])

  const fetchSampleTests = useCallback(async (sampleId: string) => {
    if (!sampleId) {
      setSampleTests([])
      return
    }

    try {
      setLoadingTests(true)
      const { data, error } = await supabase
        .from('sample_tests')
        .select(`
          *,
          test_catalog (id, name, area),
          methods (id, name)
        `)
        .eq('sample_id', sampleId)

      if (error) throw error
      setSampleTests(data || [])
    } catch (error) {
      console.error('Error fetching sample tests:', error)
      setSampleTests([])
    } finally {
      setLoadingTests(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen) {
      fetchSamples()
      if (preselectedSampleId) {
        fetchSampleTests(preselectedSampleId)
      }
    }
  }, [isOpen, fetchSamples, fetchSampleTests, preselectedSampleId])

  useEffect(() => {
    if (formData.sample_id) {
      fetchSampleTests(formData.sample_id)
    } else {
      setSampleTests([])
    }
  }, [formData.sample_id, fetchSampleTests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.sample_id || !formData.sample_test_id) {
        alert('Debe seleccionar una muestra y un análisis')
        return
      }

      const response = await fetch('/api/results', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sample_id: formData.sample_id,
          sample_test_id: formData.sample_test_id,
          methodology: formData.methodology || null,
          findings: formData.findings ? JSON.parse(formData.findings) : null,
          conclusion: formData.conclusion || null,
          diagnosis: formData.diagnosis || null,
          pathogen_identified: formData.pathogen_identified || null,
          pathogen_type: formData.pathogen_type || null,
          severity: formData.severity || null,
          confidence: formData.confidence || null,
          result_type: formData.result_type || null,
          recommendations: formData.recommendations || null
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to create result')
      }

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        sample_id: preselectedSampleId || '',
        sample_test_id: '',
        methodology: '',
        findings: '',
        conclusion: '',
        diagnosis: '',
        pathogen_identified: '',
        pathogen_type: '',
        severity: '',
        confidence: '',
        result_type: '',
        recommendations: ''
      })
    } catch (error: unknown) {
      console.error('Error creating result:', error)
      alert('Error al crear el resultado: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const selectedSample = samples.find(s => s.id === formData.sample_id)

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-6 pt-6 pb-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <FlaskConical className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Nuevo Resultado
                    </h3>
                    <p className="text-sm text-gray-500">
                      Registrar el resultado de un análisis de laboratorio
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

            <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                {/* Sample Selection */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Selección de Muestra y Análisis</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Muestra *
                  </label>
                  <select
                    required
                    value={formData.sample_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_id: e.target.value, sample_test_id: '' }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={!!preselectedSampleId}
                  >
                    <option value="">Seleccionar muestra</option>
                    {loadingSamples ? (
                      <option disabled>Cargando muestras...</option>
                    ) : (
                      samples.map(sample => (
                        <option key={sample.id} value={sample.id}>
                          {sample.code} - {sample.clients?.name} ({sample.species})
                        </option>
                      ))
                    )}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Análisis *
                  </label>
                  <select
                    required
                    value={formData.sample_test_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, sample_test_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    disabled={!formData.sample_id}
                  >
                    <option value="">Seleccionar análisis</option>
                    {loadingTests ? (
                      <option disabled>Cargando análisis...</option>
                    ) : (
                      sampleTests.map(test => (
                        <option key={test.id} value={test.id}>
                          {test.test_catalog?.name} ({test.test_catalog?.area}) - {test.methods?.name}
                        </option>
                      ))
                    )}
                  </select>
                </div>

                {/* Sample Info Display */}
                {selectedSample && (
                  <div className="sm:col-span-2 bg-blue-50 rounded-lg p-4">
                    <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                      <TestTube className="h-4 w-4 mr-2" />
                      Información de la Muestra
                    </h5>
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <span className="text-gray-500">Código:</span> {selectedSample.code}
                      </div>
                      <div>
                        <span className="text-gray-500">Cliente:</span> {selectedSample.clients?.name}
                      </div>
                      <div>
                        <span className="text-gray-500">Especie:</span> {selectedSample.species}
                      </div>
                      <div>
                        <span className="text-gray-500">Fecha:</span> {new Date(selectedSample.received_date).toLocaleDateString()}
                      </div>
                    </div>
                  </div>
                )}

                {/* Result Information */}
                <div className="sm:col-span-2">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información del Resultado</h4>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Resultado
                  </label>
                  <select
                    value={formData.result_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="positive">Positivo</option>
                    <option value="negative">Negativo</option>
                    <option value="inconclusive">No conclusivo</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Confianza
                  </label>
                  <select
                    value={formData.confidence}
                    onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar confianza</option>
                    <option value="low">Baja</option>
                    <option value="medium">Media</option>
                    <option value="high">Alta</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patógeno Identificado
                  </label>
                  <input
                    type="text"
                    value={formData.pathogen_identified}
                    onChange={(e) => setFormData(prev => ({ ...prev, pathogen_identified: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre del patógeno"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de Patógeno
                  </label>
                  <select
                    value={formData.pathogen_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, pathogen_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar tipo</option>
                    <option value="fungus">Hongo</option>
                    <option value="bacteria">Bacteria</option>
                    <option value="virus">Virus</option>
                    <option value="nematode">Nematodo</option>
                    <option value="insect">Insecto</option>
                    <option value="abiotic">Abiótico</option>
                    <option value="unknown">Desconocido</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Severidad
                  </label>
                  <select
                    value={formData.severity}
                    onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  >
                    <option value="">Seleccionar severidad</option>
                    <option value="low">Baja</option>
                    <option value="moderate">Moderada</option>
                    <option value="high">Alta</option>
                    <option value="severe">Severa</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Metodología
                  </label>
                  <input
                    type="text"
                    value={formData.methodology}
                    onChange={(e) => setFormData(prev => ({ ...prev, methodology: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Metodología utilizada"
                  />
                </div>

                {/* Text Areas */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Diagnóstico
                  </label>
                  <textarea
                    rows={3}
                    value={formData.diagnosis}
                    onChange={(e) => setFormData(prev => ({ ...prev, diagnosis: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Diagnóstico detallado del análisis..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Conclusión
                  </label>
                  <textarea
                    rows={3}
                    value={formData.conclusion}
                    onChange={(e) => setFormData(prev => ({ ...prev, conclusion: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Conclusiones del análisis..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recomendaciones
                  </label>
                  <textarea
                    rows={3}
                    value={formData.recommendations}
                    onChange={(e) => setFormData(prev => ({ ...prev, recommendations: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Recomendaciones para el cliente..."
                  />
                </div>

                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Hallazgos Técnicos (JSON)
                  </label>
                  <textarea
                    rows={3}
                    value={formData.findings}
                    onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500 font-mono text-sm"
                    placeholder='{"observaciones": "...", "mediciones": "...", "notas": "..."}'
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Formato JSON opcional para datos estructurados
                  </p>
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-6 py-3 flex justify-end space-x-3">
              <button
                type="button"
                onClick={onClose}
                className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : null}
                {isSubmitting ? 'Creando...' : 'Crear Resultado'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}