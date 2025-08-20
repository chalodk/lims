'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ResultWithRelations } from '@/types/database'
import { 
  FlaskConical,
  X,
  Loader2,
  TestTube,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface EditResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  resultId: string | null
}

export default function EditResultModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  resultId 
}: EditResultModalProps) {
  const { userRole } = useAuth()
  const [result, setResult] = useState<ResultWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  const [formData, setFormData] = useState({
    methodology: '',
    findings: '',
    conclusion: '',
    diagnosis: '',
    pathogen_identified: '',
    pathogen_type: '',
    severity: '',
    confidence: '',
    result_type: '',
    recommendations: '',
    status: 'pending'
  })

  const fetchResult = useCallback(async () => {
    if (!resultId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/results/${resultId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch result')
      }
      
      const data = await response.json()
      setResult(data)
      
      // Populate form with existing data
      setFormData({
        methodology: data.methodology || '',
        findings: data.findings ? JSON.stringify(data.findings, null, 2) : '',
        conclusion: data.conclusion || '',
        diagnosis: data.diagnosis || '',
        pathogen_identified: data.pathogen_identified || '',
        pathogen_type: data.pathogen_type || '',
        severity: data.severity || '',
        confidence: data.confidence || '',
        result_type: data.result_type || '',
        recommendations: data.recommendations || '',
        status: data.status || 'pending'
      })
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resultId) return
    
    setIsSubmitting(true)

    try {
      let findingsData = null
      if (formData.findings.trim()) {
        try {
          findingsData = JSON.parse(formData.findings)
        } catch {
          alert('El formato de hallazgos técnicos no es JSON válido')
          return
        }
      }

      const response = await fetch(`/api/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          methodology: formData.methodology || null,
          findings: findingsData,
          conclusion: formData.conclusion || null,
          diagnosis: formData.diagnosis || null,
          pathogen_identified: formData.pathogen_identified || null,
          pathogen_type: formData.pathogen_type || null,
          severity: formData.severity || null,
          confidence: formData.confidence || null,
          result_type: formData.result_type || null,
          recommendations: formData.recommendations || null,
          status: formData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update result')
      }

      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Error updating result:', error)
      alert('Error al actualizar el resultado: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmitting(false)
    }
  }

  const canValidate = userRole && ['admin', 'validador'].includes(userRole)
  const canEdit = result && (result.status !== 'validated' || canValidate)

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
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-blue-100">
                  <FlaskConical className="h-6 w-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Editar Resultado
                  </h3>
                  <p className="text-sm text-gray-500">
                    {result?.samples?.code ? `Muestra: ${result.samples.code}` : 'Modificar resultado de análisis'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={onClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 max-h-[70vh] overflow-y-auto">
            {isLoading ? (
              <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
                <span className="ml-2 text-gray-600">Cargando resultado...</span>
              </div>
            ) : error ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Error al cargar</h3>
                <p className="mt-1 text-sm text-gray-500">{error}</p>
                <button
                  onClick={fetchResult}
                  className="mt-4 inline-flex items-center px-4 py-2 border border-transparent text-sm font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200"
                >
                  Reintentar
                </button>
              </div>
            ) : !result ? (
              <div className="text-center py-12">
                <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Resultado no encontrado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  El resultado solicitado no se pudo encontrar.
                </p>
              </div>
            ) : !canEdit ? (
              <div className="text-center py-12">
                <AlertCircle className="mx-auto h-12 w-12 text-amber-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">Resultado validado</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Este resultado ya ha sido validado y no puede ser editado.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmit}>
                {/* Sample Info Display */}
                <div className="bg-blue-50 rounded-lg p-4 mb-6">
                  <h5 className="text-sm font-medium text-gray-900 mb-2 flex items-center">
                    <TestTube className="h-4 w-4 mr-2" />
                    Información de la Muestra
                  </h5>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <span className="text-gray-500">Código:</span> {result.samples?.code}
                    </div>
                    <div>
                      <span className="text-gray-500">Cliente:</span> {result.samples?.clients?.name}
                    </div>
                    <div>
                      <span className="text-gray-500">Especie:</span> {result.samples?.species}
                    </div>
                    <div>
                      <span className="text-gray-500">Análisis:</span> {result.sample_tests?.test_catalog?.name}
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Status */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Estado *
                    </label>
                    <select
                      required
                      value={formData.status}
                      onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="pending">Pendiente</option>
                      <option value="completed">Completado</option>
                      {canValidate && <option value="validated">Validado</option>}
                    </select>
                  </div>

                  {/* Result Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Resultado
                    </label>
                    <select
                      value={formData.result_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, result_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar tipo</option>
                      <option value="positive">Positivo</option>
                      <option value="negative">Negativo</option>
                      <option value="inconclusive">No conclusivo</option>
                    </select>
                  </div>

                  {/* Confidence */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confianza
                    </label>
                    <select
                      value={formData.confidence}
                      onChange={(e) => setFormData(prev => ({ ...prev, confidence: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar confianza</option>
                      <option value="low">Baja</option>
                      <option value="medium">Media</option>
                      <option value="high">Alta</option>
                    </select>
                  </div>

                  {/* Pathogen Identified */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Patógeno Identificado
                    </label>
                    <input
                      type="text"
                      value={formData.pathogen_identified}
                      onChange={(e) => setFormData(prev => ({ ...prev, pathogen_identified: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Nombre del patógeno"
                    />
                  </div>

                  {/* Pathogen Type */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Tipo de Patógeno
                    </label>
                    <select
                      value={formData.pathogen_type}
                      onChange={(e) => setFormData(prev => ({ ...prev, pathogen_type: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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

                  {/* Severity */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Severidad
                    </label>
                    <select
                      value={formData.severity}
                      onChange={(e) => setFormData(prev => ({ ...prev, severity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Seleccionar severidad</option>
                      <option value="low">Baja</option>
                      <option value="moderate">Moderada</option>
                      <option value="high">Alta</option>
                      <option value="severe">Severa</option>
                    </select>
                  </div>

                  {/* Methodology */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Metodología
                    </label>
                    <input
                      type="text"
                      value={formData.methodology}
                      onChange={(e) => setFormData(prev => ({ ...prev, methodology: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
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
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Recomendaciones para el cliente..."
                    />
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Hallazgos Técnicos (JSON)
                    </label>
                    <textarea
                      rows={4}
                      value={formData.findings}
                      onChange={(e) => setFormData(prev => ({ ...prev, findings: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 font-mono text-sm"
                      placeholder='{"observaciones": "...", "mediciones": "...", "notas": "..."}'
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Formato JSON opcional para datos estructurados
                    </p>
                  </div>
                </div>

                {/* Validation Warning */}
                {formData.status === 'validated' && (
                  <div className="mt-6 bg-amber-50 border border-amber-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-amber-400 mr-3" />
                      <div>
                        <h4 className="text-sm font-medium text-amber-800">Validación de Resultado</h4>
                        <p className="text-sm text-amber-700 mt-1">
                          Al marcar este resultado como validado, no podrá ser editado posteriormente por usuarios regulares.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {/* Form Actions */}
                <div className="mt-8 flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={onClose}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin mr-2" />
                        Actualizando...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Actualizar Resultado
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}