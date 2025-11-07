'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { ResultWithRelations } from '@/types/database'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { 
  FlaskConical,
  X,
  Loader2,
  AlertCircle,
  CheckCircle
} from 'lucide-react'

interface EditResultModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  resultId: string | null
}

interface Sample {
  id: string
  code: string
  species: string | null
  clients?: {
    id: string
    name: string
  } | null
}

interface SampleTest {
  id: string
  test_catalog?: {
    id: number
    name: string
    area: string | null
  } | null
}

interface Report {
  id: string
  id_display?: string | null
  generated_at?: string | null
}

interface UserOption {
  id: string
  name: string
  email: string
}

export default function EditResultModal({ 
  isOpen, 
  onClose, 
  onSuccess, 
  resultId 
}: EditResultModalProps) {
  const { user, userRole } = useAuth()
  const [result, setResult] = useState<ResultWithRelations | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [validationError, setValidationError] = useState<string | null>(null)
  
  // Data for selectors
  const [samples, setSamples] = useState<Sample[]>([])
  const [sampleTests, setSampleTests] = useState<SampleTest[]>([])
  const [reports, setReports] = useState<Report[]>([])
  const [users, setUsers] = useState<UserOption[]>([])
  const [loadingOptions, setLoadingOptions] = useState(false)
  
  const supabase = getSupabaseClient()
  
  const [formData, setFormData] = useState({
    sample_id: '',
    sample_test_id: '',
    report_id: '',
    test_area: '',
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
    performed_by: '',
    performed_at: '',
    validated_by: '',
    validation_date: '',
    status: 'pending'
  })

  // Fetch options for selectors
  const fetchSamples = useCallback(async () => {
    if (!user?.company_id) return

    try {
      const { data, error } = await supabase
        .from('samples')
        .select(`
          id,
          code,
          species,
          clients (id, name)
        `)
        .eq('company_id', user.company_id)
        .order('code', { ascending: true })

      if (error) throw error
      
      // Transform data to match Sample interface
      // Supabase returns clients as an array, but we need it as a single object
      type SupabaseSampleResponse = {
        id: string
        code: string
        species: string | null
        clients: Array<{ id: string; name: string }> | null
      }
      
      const transformedData: Sample[] = (data || []).map((sample: SupabaseSampleResponse) => ({
        id: sample.id,
        code: sample.code,
        species: sample.species,
        clients: Array.isArray(sample.clients) && sample.clients.length > 0
          ? { id: sample.clients[0].id, name: sample.clients[0].name }
          : null
      }))
      
      setSamples(transformedData)
    } catch (error) {
      console.error('Error fetching samples:', error)
    }
  }, [supabase, user?.company_id])

  const fetchSampleTests = useCallback(async (sampleId: string) => {
    if (!sampleId) {
      setSampleTests([])
      return
    }

    try {
      const { data, error } = await supabase
        .from('sample_tests')
        .select(`
          id,
          test_catalog (id, name, area)
        `)
        .eq('sample_id', sampleId)

      if (error) throw error
      
      // Transform data to match SampleTest interface
      // Supabase returns test_catalog as an array, but we need it as a single object
      type SupabaseSampleTestResponse = {
        id: string
        test_catalog: Array<{ id: number; name: string; area: string | null }> | null
      }
      
      const transformedData: SampleTest[] = (data || []).map((test: SupabaseSampleTestResponse) => ({
        id: test.id,
        test_catalog: Array.isArray(test.test_catalog) && test.test_catalog.length > 0
          ? {
              id: test.test_catalog[0].id,
              name: test.test_catalog[0].name,
              area: test.test_catalog[0].area
            }
          : null
      }))
      
      setSampleTests(transformedData)
    } catch (error) {
      console.error('Error fetching sample tests:', error)
      setSampleTests([])
    }
  }, [supabase])

  const fetchReports = useCallback(async () => {
    if (!user?.company_id) return

    try {
      const { data, error } = await supabase
        .from('reports')
        .select('id, id_display, generated_at')
        .eq('company_id', user.company_id)
        .order('generated_at', { ascending: false })
        .limit(100)

      if (error) throw error
      setReports((data || []) as Report[])
    } catch (error) {
      console.error('Error fetching reports:', error)
    }
  }, [supabase, user?.company_id])

  const fetchUsers = useCallback(async () => {
    if (!user?.company_id) return

    try {
      const { data, error } = await supabase
        .from('users')
        .select('id, name, email')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setUsers((data || []) as UserOption[])
    } catch (error) {
      console.error('Error fetching users:', error)
    }
  }, [supabase, user?.company_id])

  const fetchAllOptions = useCallback(async () => {
    setLoadingOptions(true)
    try {
      await Promise.all([
        fetchSamples(),
        fetchReports(),
        fetchUsers()
      ])
    } finally {
      setLoadingOptions(false)
    }
  }, [fetchSamples, fetchReports, fetchUsers])

  const fetchResult = useCallback(async () => {
    if (!resultId) return

    try {
      setIsLoading(true)
      setError(null)
      setValidationError(null)
      
      const response = await fetch(`/api/results/${resultId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch result')
      }
      
      const data = await response.json()
      setResult(data)
      
      // Populate form with existing data
      setFormData({
        sample_id: data.sample_id || '',
        sample_test_id: data.sample_test_id || '',
        report_id: (data as { report_id?: string | null }).report_id || '',
        test_area: data.test_area || '',
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
        performed_by: data.performed_by || '',
        performed_at: data.performed_at ? new Date(data.performed_at).toISOString().slice(0, 16) : '',
        validated_by: data.validated_by || '',
        validation_date: data.validation_date ? new Date(data.validation_date).toISOString().slice(0, 16) : '',
        status: data.status || 'pending'
      })

      // Load sample tests for the selected sample
      if (data.sample_id) {
        await fetchSampleTests(data.sample_id)
      }
    } catch (error) {
      console.error('Error fetching result:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el resultado')
    } finally {
      setIsLoading(false)
    }
  }, [resultId, fetchSampleTests])

  useEffect(() => {
    if (isOpen && resultId) {
      fetchAllOptions()
      fetchResult()
    }
  }, [isOpen, resultId, fetchAllOptions, fetchResult])

  // When sample_id changes, load its sample tests
  useEffect(() => {
    if (formData.sample_id) {
      fetchSampleTests(formData.sample_id)
    } else {
      setSampleTests([])
      setFormData(prev => ({ ...prev, sample_test_id: '' }))
    }
  }, [formData.sample_id, fetchSampleTests])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!resultId) return
    
    setValidationError(null)
    setIsSubmitting(true)

    try {
      // Validate required fields
      if (!formData.sample_id) {
        setValidationError('El campo Muestra es obligatorio')
        setIsSubmitting(false)
        return
      }

      // Parse findings JSON
      let findingsData = null
      if (formData.findings.trim()) {
        try {
          findingsData = JSON.parse(formData.findings)
        } catch {
          setValidationError('El formato de hallazgos técnicos no es JSON válido')
          setIsSubmitting(false)
          return
        }
      }

      // Prepare update data
      const updateData: Record<string, unknown> = {
        sample_id: formData.sample_id,
        sample_test_id: formData.sample_test_id || null,
        report_id: formData.report_id || null,
        test_area: formData.test_area || null,
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
        status: formData.status,
        performed_by: formData.performed_by || null,
        performed_at: formData.performed_at ? new Date(formData.performed_at).toISOString() : null,
        validated_by: formData.validated_by || null,
        validation_date: formData.validation_date ? new Date(formData.validation_date).toISOString() : null
      }

      // If status is validated and validated_by is not set, use current user
      if (formData.status === 'validated' && !formData.validated_by && user?.id) {
        updateData.validated_by = user.id
        updateData.validation_date = new Date().toISOString()
      }

      // If validated_by is cleared, clear validation_date
      if (!formData.validated_by) {
        updateData.validation_date = null
      }

      const response = await fetch(`/api/results/${resultId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to update result'
        
        // Parse common database errors
        if (errorMessage.includes('NOT NULL')) {
          setValidationError('Uno o más campos obligatorios están vacíos')
        } else if (errorMessage.includes('FOREIGN KEY')) {
          setValidationError('Uno de los valores seleccionados no existe en la base de datos')
        } else if (errorMessage.includes('CHECK')) {
          setValidationError('Uno de los valores seleccionados no es válido según las restricciones')
        } else {
          setValidationError(errorMessage)
        }
        setIsSubmitting(false)
        return
      }

      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Error updating result:', error)
      setValidationError('Error al actualizar el resultado: ' + (error instanceof Error ? error.message : 'Error desconocido'))
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
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-5xl sm:w-full">
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
                disabled={isSubmitting}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
              >
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Content */}
          <div className="bg-white px-6 py-6 max-h-[75vh] overflow-y-auto">
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
                {/* Validation Error */}
                {validationError && (
                  <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4">
                    <div className="flex items-center">
                      <AlertCircle className="h-5 w-5 text-red-400 mr-3" />
                      <p className="text-sm text-red-700">{validationError}</p>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                  {/* Sample ID - REQUIRED */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Muestra *
                    </label>
                    <select
                      required
                      value={formData.sample_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, sample_id: e.target.value, sample_test_id: '' }))}
                      disabled={loadingOptions}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Seleccionar muestra</option>
                      {samples.map(sample => (
                        <option key={sample.id} value={sample.id}>
                          {sample.code} - {sample.clients?.name || 'Sin cliente'} {sample.species ? `(${sample.species})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Sample Test ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Test de Muestra
                    </label>
                    <select
                      value={formData.sample_test_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, sample_test_id: e.target.value }))}
                      disabled={!formData.sample_id || loadingOptions}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sin test específico</option>
                      {sampleTests.map(test => (
                        <option key={test.id} value={test.id}>
                          {test.test_catalog?.name || 'Test'} {test.test_catalog?.area ? `(${test.test_catalog.area})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Report ID */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Informe
                    </label>
                    <select
                      value={formData.report_id}
                      onChange={(e) => setFormData(prev => ({ ...prev, report_id: e.target.value }))}
                      disabled={loadingOptions}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sin informe</option>
                      {reports.map(report => (
                        <option key={report.id} value={report.id}>
                          {report.id_display || report.id.slice(0, 8)} {report.generated_at ? `(${new Date(report.generated_at).toLocaleDateString()})` : ''}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Test Area */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Área de Análisis
                    </label>
                    <input
                      type="text"
                      value={formData.test_area}
                      onChange={(e) => setFormData(prev => ({ ...prev, test_area: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Ej: Nematología, Fitopatología"
                    />
                  </div>

                  {/* Status - REQUIRED */}
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
                  {!(formData.result_type === 'negative' && formData.pathogen_type === 'nematode') && (
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
                  )}

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

                  {/* Performed By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Realizado Por
                    </label>
                    <select
                      value={formData.performed_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, performed_by: e.target.value }))}
                      disabled={loadingOptions}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sin asignar</option>
                      {users.map(userOpt => (
                        <option key={userOpt.id} value={userOpt.id}>
                          {userOpt.name} ({userOpt.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Performed At */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Realización
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.performed_at}
                      onChange={(e) => setFormData(prev => ({ ...prev, performed_at: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    />
                  </div>

                  {/* Validated By */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Validado Por
                    </label>
                    <select
                      value={formData.validated_by}
                      onChange={(e) => setFormData(prev => ({ 
                        ...prev, 
                        validated_by: e.target.value,
                        validation_date: e.target.value ? (formData.validation_date || new Date().toISOString().slice(0, 16)) : ''
                      }))}
                      disabled={loadingOptions || !canValidate}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    >
                      <option value="">Sin validar</option>
                      {users.map(userOpt => (
                        <option key={userOpt.id} value={userOpt.id}>
                          {userOpt.name} ({userOpt.email})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Validation Date */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Fecha de Validación
                    </label>
                    <input
                      type="datetime-local"
                      value={formData.validation_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, validation_date: e.target.value }))}
                      disabled={!formData.validated_by}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 disabled:bg-gray-100"
                    />
                    {!formData.validated_by && (
                      <p className="text-xs text-gray-500 mt-1">Asigne un validador primero</p>
                    )}
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
                      rows={6}
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
                    disabled={isSubmitting}
                    className="inline-flex items-center px-4 py-2 border border-gray-300 shadow-sm text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
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