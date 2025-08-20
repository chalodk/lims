'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { 
  Client, 
  TestCatalog, 
  Method, 
  Species, 
  Variety,
  Project 
} from '@/types/database'
import { 
  TestTube, 
  Loader2,
  X,
  Plus,
  Trash2
} from 'lucide-react'

interface EnhancedSampleFormProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  initialData?: Record<string, unknown>
  isEditing?: boolean
}

interface SelectedTest {
  test_id: number
  method_id?: number
  test?: TestCatalog
  method?: Method
}

interface SampleUnit {
  code?: string
  label?: string
}

export default function EnhancedSampleForm({ 
  isOpen, 
  onClose, 
  onSuccess, 
  initialData, 
  isEditing = false 
}: EnhancedSampleFormProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Project[]>([])
  const [tests, setTests] = useState<TestCatalog[]>([])
  const [methods, setMethods] = useState<Method[]>([])
  const [species, setSpecies] = useState<Species[]>([])
  const [varieties, setVarieties] = useState<Variety[]>([])
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  const [selectedTests, setSelectedTests] = useState<SelectedTest[]>([])
  const [sampleUnits, setSampleUnits] = useState<SampleUnit[]>([{ code: '1', label: 'Muestra 1' }])
  
  const [formData, setFormData] = useState({
    client_id: '',
    code: '',
    received_date: new Date().toISOString().split('T')[0],
    sla_type: 'normal',
    project_id: '',
    species: '',
    variety: '',
    planting_year: '',
    previous_crop: '',
    next_crop: '',
    fallow: false,
    client_notes: '',
    reception_notes: '',
    taken_by: 'client',
    delivery_method: '',
    suspected_pathogen: '',
    region: '',
    locality: '',
    sampling_observations: '',
    reception_observations: ''
  })
  
  const supabase = createClient()

  // Load catalog data
  useEffect(() => {
    if (isOpen) {
      loadCatalogData()
    }
  }, [isOpen, loadCatalogData])

  const loadCatalogData = useCallback(async () => {
    try {
      const [
        clientsResponse,
        projectsResponse,
        testsResponse,
        methodsResponse,
        speciesResponse
      ] = await Promise.all([
        supabase.from('clients').select('*').order('name'),
        supabase.from('projects').select('*').order('name'),
        supabase.from('test_catalog').select('*').eq('active', true).order('name'),
        supabase.from('methods').select('*').order('name'),
        supabase.from('species').select('*').order('name')
      ])

      if (clientsResponse.data) setClients(clientsResponse.data)
      if (projectsResponse.data) setProjects(projectsResponse.data)
      if (testsResponse.data) setTests(testsResponse.data)
      if (methodsResponse.data) setMethods(methodsResponse.data)
      if (speciesResponse.data) setSpecies(speciesResponse.data)
    } catch (error) {
      console.error('Error loading catalog data:', error)
    }
  }, [supabase])

  // Load varieties when species changes
  useEffect(() => {
    if (formData.species) {
      loadVarieties()
    } else {
      setVarieties([])
    }
  }, [formData.species, loadVarieties])

  const loadVarieties = useCallback(async () => {
    try {
      const selectedSpecies = species.find(s => s.name === formData.species)
      if (!selectedSpecies) return

      const { data } = await supabase
        .from('varieties')
        .select('*')
        .eq('species_id', selectedSpecies.id)
        .order('name')

      if (data) setVarieties(data)
    } catch (error) {
      console.error('Error loading varieties:', error)
    }
  }, [supabase, species, formData.species])

  const handleInputChange = (field: string, value: string | number | boolean) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  const addTest = () => {
    if (tests.length === 0) return
    setSelectedTests(prev => [...prev, { test_id: tests[0].id }])
  }

  const removeTest = (index: number) => {
    setSelectedTests(prev => prev.filter((_, i) => i !== index))
  }

  const updateTest = (index: number, field: keyof SelectedTest, value: number | undefined) => {
    setSelectedTests(prev => prev.map((test, i) => 
      i === index ? { ...test, [field]: value } : test
    ))
  }

  const addUnit = () => {
    const unitNumber = sampleUnits.length + 1
    setSampleUnits(prev => [...prev, { 
      code: unitNumber.toString(), 
      label: `Muestra ${unitNumber}` 
    }])
  }

  const removeUnit = (index: number) => {
    if (sampleUnits.length > 1) {
      setSampleUnits(prev => prev.filter((_, i) => i !== index))
    }
  }

  const updateUnit = (index: number, field: keyof SampleUnit, value: string) => {
    setSampleUnits(prev => prev.map((unit, i) => 
      i === index ? { ...unit, [field]: value } : unit
    ))
  }

  const getMethodsForTest = () => {
    return methods.filter(method => {
      // Filter methods based on test compatibility if you have test_method_map
      return true // For now, show all methods
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user || isSubmitting) return

    setIsSubmitting(true)
    
    try {
      const sampleData = {
        ...formData,
        company_id: user.user_metadata?.company_id || null,
        received_at: new Date(`${formData.received_date}T00:00:00`).toISOString(),
        registered_date: new Date().toISOString().split('T')[0]
      }

      let sampleResponse
      if (isEditing && initialData?.id) {
        sampleResponse = await supabase
          .from('samples')
          .update(sampleData)
          .eq('id', initialData.id)
          .select()
          .single()
      } else {
        sampleResponse = await supabase
          .from('samples')
          .insert(sampleData)
          .select()
          .single()
      }

      if (sampleResponse.error) throw sampleResponse.error
      
      const sampleId = sampleResponse.data.id

      // Insert/update tests
      if (!isEditing) {
        if (selectedTests.length > 0) {
          const testInserts = selectedTests.map(test => ({
            sample_id: sampleId,
            test_id: test.test_id,
            method_id: test.method_id || null
          }))

          const { error: testsError } = await supabase
            .from('sample_tests')
            .insert(testInserts)

          if (testsError) throw testsError
        }

        // Insert sample units
        if (sampleUnits.length > 0) {
          const unitInserts = sampleUnits.map(unit => ({
            sample_id: sampleId,
            code: unit.code,
            label: unit.label
          }))

          const { error: unitsError } = await supabase
            .from('sample_units')
            .insert(unitInserts)

          if (unitsError) throw unitsError
        }
      }

      onSuccess()
      onClose()
      resetForm()
    } catch (error) {
      console.error('Error saving sample:', error)
      alert('Error al guardar la muestra')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setFormData({
      client_id: '',
      code: '',
      received_date: new Date().toISOString().split('T')[0],
      sla_type: 'normal',
      project_id: '',
      species: '',
      variety: '',
      planting_year: '',
      previous_crop: '',
      next_crop: '',
      fallow: false,
      client_notes: '',
      reception_notes: '',
      taken_by: 'client',
      delivery_method: '',
      suspected_pathogen: '',
      region: '',
      locality: '',
      sampling_observations: '',
      reception_observations: ''
    })
    setSelectedTests([])
    setSampleUnits([{ code: '1', label: 'Muestra 1' }])
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold flex items-center gap-2">
              <TestTube className="h-6 w-6" />
              {isEditing ? 'Editar Muestra' : 'Nueva Muestra'}
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="h-6 w-6" />
            </button>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Basic Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cliente *
                </label>
                <select
                  value={formData.client_id}
                  onChange={(e) => handleInputChange('client_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar cliente</option>
                  {clients.map((client) => (
                    <option key={client.id} value={client.id}>
                      {client.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Código de Muestra *
                </label>
                <input
                  type="text"
                  value={formData.code}
                  onChange={(e) => handleInputChange('code', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Fecha de Recepción *
                </label>
                <input
                  type="date"
                  value={formData.received_date}
                  onChange={(e) => handleInputChange('received_date', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tipo SLA
                </label>
                <select
                  value={formData.sla_type}
                  onChange={(e) => handleInputChange('sla_type', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="normal">Normal</option>
                  <option value="express">Express</option>
                </select>
              </div>
            </div>

            {/* Location and Project */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Proyecto
                </label>
                <select
                  value={formData.project_id}
                  onChange={(e) => handleInputChange('project_id', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">Seleccionar proyecto</option>
                  {projects.map((project) => (
                    <option key={project.id} value={project.id}>
                      {project.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Región
                </label>
                <input
                  type="text"
                  value={formData.region}
                  onChange={(e) => handleInputChange('region', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Localidad
                </label>
                <input
                  type="text"
                  value={formData.locality}
                  onChange={(e) => handleInputChange('locality', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Species and Variety */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Especie *
                </label>
                <select
                  value={formData.species}
                  onChange={(e) => handleInputChange('species', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                >
                  <option value="">Seleccionar especie</option>
                  {species.map((sp) => (
                    <option key={sp.id} value={sp.name}>
                      {sp.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Variedad
                </label>
                <select
                  value={formData.variety}
                  onChange={(e) => handleInputChange('variety', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  disabled={varieties.length === 0}
                >
                  <option value="">Seleccionar variedad</option>
                  {varieties.map((variety) => (
                    <option key={variety.id} value={variety.name}>
                      {variety.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Tests Selection */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Tests Solicitados
                </label>
                <button
                  type="button"
                  onClick={addTest}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-blue-600 text-white rounded hover:bg-blue-700"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Test
                </button>
              </div>
              
              <div className="space-y-2">
                {selectedTests.map((test, index) => (
                  <div key={index} className="flex items-center gap-3 p-3 border border-gray-200 rounded">
                    <select
                      value={test.test_id}
                      onChange={(e) => updateTest(index, 'test_id', Number(e.target.value))}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      {tests.map((t) => (
                        <option key={t.id} value={t.id}>
                          {t.name} ({t.area})
                        </option>
                      ))}
                    </select>

                    <select
                      value={test.method_id || ''}
                      onChange={(e) => updateTest(index, 'method_id', e.target.value ? Number(e.target.value) : undefined)}
                      className="flex-1 px-3 py-2 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="">Método sugerido</option>
                      {getMethodsForTest().map((method) => (
                        <option key={method.id} value={method.id}>
                          {method.name} ({method.matrix})
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => removeTest(index)}
                      className="p-2 text-red-600 hover:text-red-800"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* Sample Units */}
            <div>
              <div className="flex items-center justify-between mb-3">
                <label className="block text-sm font-medium text-gray-700">
                  Unidades/Sub-muestras
                </label>
                <button
                  type="button"
                  onClick={addUnit}
                  className="flex items-center gap-1 px-3 py-1 text-sm bg-green-600 text-white rounded hover:bg-green-700"
                >
                  <Plus className="h-4 w-4" />
                  Agregar Unidad
                </button>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {sampleUnits.map((unit, index) => (
                  <div key={index} className="flex items-center gap-2 p-2 border border-gray-200 rounded">
                    <input
                      type="text"
                      value={unit.code || ''}
                      onChange={(e) => updateUnit(index, 'code', e.target.value)}
                      placeholder="Código"
                      className="w-20 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    <input
                      type="text"
                      value={unit.label || ''}
                      onChange={(e) => updateUnit(index, 'label', e.target.value)}
                      placeholder="Etiqueta"
                      className="flex-1 px-2 py-1 border border-gray-300 rounded focus:outline-none focus:ring-1 focus:ring-blue-500"
                    />
                    {sampleUnits.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeUnit(index)}
                        className="p-1 text-red-600 hover:text-red-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Additional Information */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones de Muestreo
                </label>
                <textarea
                  value={formData.sampling_observations}
                  onChange={(e) => handleInputChange('sampling_observations', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Observaciones de Recepción
                </label>
                <textarea
                  value={formData.reception_observations}
                  onChange={(e) => handleInputChange('reception_observations', e.target.value)}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Submit Buttons */}
            <div className="flex justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-gray-700 bg-gray-100 rounded hover:bg-gray-200"
                disabled={isSubmitting}
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-300 flex items-center gap-2"
              >
                {isSubmitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {isEditing ? 'Actualizar' : 'Crear'} Muestra
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}