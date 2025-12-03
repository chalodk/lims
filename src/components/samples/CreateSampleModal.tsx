'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/hooks/useAuth'
import { Client } from '@/types/database'
import { SPECIES_CATEGORIES } from '@/constants/species'
import { PROJECT_OPTIONS } from '@/constants/projects'
import CreateClientModal from '@/components/clients/CreateClientModal'
import CreateProjectModal from '@/components/projects/CreateProjectModal'
import { 
  TestTube, 
  Loader2,
  X
} from 'lucide-react'

interface CreateSampleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSampleModal({ isOpen, onClose, onSuccess }: CreateSampleModalProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableAnalytes, setAvailableAnalytes] = useState<Array<{id: string, scientific_name: string}>>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  const [showCreateClientModal, setShowCreateClientModal] = useState(false)
  const [showCreateProjectModal, setShowCreateProjectModal] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    code: '',
    received_date: new Date().toISOString().split('T')[0],
    sla_type: 'normal',
    project: '',
    project_id: '',
    species: '',
    variety: '',
    rootstock: '',
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
    reception_observations: '',
    due_date: '',
    sla_status: 'on_time',
    status: 'received',
    analysis_types: [] as string[]
  })
  
  const supabase = getSupabaseClient()

  const fetchClients = useCallback(async () => {
    try {
      // Don't fetch if user data is not loaded yet
      if (!user?.company_id) {
        console.log('No user company_id available yet, skipping clients fetch')
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [supabase, user?.company_id])

  const fetchProjects = useCallback(async () => {
    try {
      setIsLoadingProjects(true)
      console.log('Fetching projects...')
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        // If there's an error or no projects in DB, create fallback from constants
        console.log('Using fallback projects from constants')
        const fallbackProjects = PROJECT_OPTIONS.map((name, index) => ({
          id: `fallback-${index}`,
          name: name
        }))
        setProjects(fallbackProjects)
        return
      }
      
      console.log('Projects data:', data)
      
      // If database is empty, use fallback
      if (!data || data.length === 0) {
        console.log('No projects in database, using fallback from constants')
        const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
          id: name, // Use name as ID for fallback to maintain compatibility
          name: name
        }))
        setProjects(fallbackProjects)
      } else {
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      // Fallback to constants
      const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
        id: name,
        name: name
      }))
      setProjects(fallbackProjects)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [supabase])

  const generateSampleCode = useCallback(() => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, code: `LIM-${year}-${randomNum}` }))
  }, [])

  // Load analytes for suspected pathogen dropdown
  const loadAnalytes = useCallback(async () => {
    try {
      const { data: analytesData, error: analytesError } = await supabase
        .from('analytes')
        .select('id, scientific_name')
        .order('scientific_name')

      if (analytesError) throw analytesError
      setAvailableAnalytes(analytesData || [])
    } catch (error) {
      console.error('Error loading analytes:', error)
    }
  }, [supabase])


  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchProjects()
      loadAnalytes()
      generateSampleCode()
      setFormData({
        client_id: '',
        code: '',
        received_date: new Date().toISOString().split('T')[0],
        sla_type: 'normal',
        project: '',
        project_id: '',
        species: '',
        variety: '',
        rootstock: '',
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
        reception_observations: '',
        due_date: '',
        sla_status: 'on_time',
        status: 'received',
        analysis_types: []
      })
      setValidationError(null)
    }
  }, [isOpen, fetchClients, fetchProjects, generateSampleCode, loadAnalytes])

  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      analysis_types: checked 
        ? [...prev.analysis_types, type]
        : prev.analysis_types.filter(t => t !== type)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setIsSubmitting(true)

    try {
      // Validation
      if (formData.analysis_types.length === 0) {
        setValidationError('Debe seleccionar al menos un tipo de análisis')
        setIsSubmitting(false)
        return
      }

      const requestBody: Record<string, unknown> = {
        client_id: formData.client_id,
        code: formData.code.trim(),
        received_date: formData.received_date,
        sla_type: formData.sla_type,
        project_id: formData.project_id || formData.project || null,
        species: formData.species.trim(),
        variety: formData.variety.trim() || null,
        rootstock: formData.rootstock.trim() || null,
        planting_year: formData.planting_year ? parseInt(formData.planting_year) : null,
        previous_crop: formData.previous_crop || null,
        next_crop: formData.next_crop || null,
        fallow: formData.fallow,
        client_notes: formData.client_notes.trim() || null,
        reception_notes: formData.reception_notes.trim() || null,
        taken_by: formData.taken_by,
        delivery_method: formData.delivery_method.trim() || null,
        suspected_pathogen: formData.suspected_pathogen.trim() || null,
        region: formData.region.trim() || null,
        locality: formData.locality.trim() || null,
        sampling_observations: formData.sampling_observations.trim() || null,
        reception_observations: formData.reception_observations.trim() || null,
      }

      // Add analysis_types for new samples
      requestBody.analysis_selections = {
        analysis_types: formData.analysis_types
      }

      const url = '/api/samples'
      const method = 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Failed to create sample'
        
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
      
      setFormData({
        client_id: '',
        code: '',
        received_date: new Date().toISOString().split('T')[0],
        sla_type: 'normal',
        project: '',
        project_id: '',
        species: '',
        variety: '',
        rootstock: '',
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
        reception_observations: '',
        due_date: '',
        sla_status: 'on_time',
        status: 'received',
        analysis_types: []
      })
      setValidationError(null)
    } catch (error: unknown) {
      console.error('Error creating sample:', error)
      setValidationError('Error al crear la muestra: ' + (error instanceof Error ? error.message : 'Error desconocido'))
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const analysisOptions = {
    types: [
      'Nematológico',
      'Fitopatológico', 
      'Virológico',
      'Bacteriológico',
      'Detección precoz de enfermedades'
    ],
    methodologies: [
      'Tamizado de Cobb y Embudo de Baermann',
      'Centrífuga',
      'Incubación y Tamizado de Cobb',
      'Placa petri',
      'Incubación',
      'Cámara húmeda',
      'Recuento de colonias'
    ],
    identificationTechniques: [
      'Taxonomía tradicional',
      'RT-PCR',
      'PCR',
      'Elisa'
    ]
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
          <TestTube className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Nueva Muestra
                    </h3>
                    <p className="text-sm text-gray-500">
                      Registra una nueva muestra para análisis
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={onClose}
                  disabled={isSubmitting}
                  className="rounded-md text-gray-400 hover:text-gray-600 disabled:opacity-50"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

              {/* Validation Error Display */}
              {validationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{validationError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Basic Info */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4">Información básica</h4>
                </div>

                {/* Client */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cliente *
                  </label>
                  <select
                    required
                    value={formData.client_id}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '__create_client__') {
                        setShowCreateClientModal(true)
                      } else {
                        setFormData(prev => ({ ...prev, client_id: value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
                    <option value="__create_client__" className="text-indigo-600 font-medium">
                      ➕ Crear Cliente
                    </option>
                  </select>
                </div>

                {/* Code */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Código de muestra *
                  </label>
                  <input
                    type="text"
                    required
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 disabled:bg-gray-100"
                  />
                </div>


                {/* Received Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de recepción *
                  </label>
                  <input
                    type="date"
                    required
                      value={formData.received_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, received_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    />
                </div>


                {/* SLA Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (SLA)
                  </label>
                  <select
                    value={formData.sla_type}
                    onChange={(e) => setFormData(prev => ({ ...prev, sla_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="express">Express</option>
                  </select>
                </div>


                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proyecto
                  </label>
                  <select
                    value={formData.project_id || formData.project}
                    onChange={(e) => {
                      const value = e.target.value
                      if (value === '__create_project__') {
                        setShowCreateProjectModal(true)
                      } else {
                        setFormData(prev => ({ ...prev, project: value, project_id: value }))
                      }
                    }}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isLoadingProjects}
                  >
                    <option value="">
                      {isLoadingProjects ? 'Cargando proyectos...' : 'Seleccionar proyecto'}
                    </option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
                    <option value="__create_project__" className="text-indigo-600 font-medium">
                      ➕ Crear Proyecto
                    </option>
                  </select>
                </div>

                {/* Species */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Especie *
                  </label>
                  <select
                    required
                    value={formData.species}
                    onChange={(e) => setFormData(prev => ({ ...prev, species: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar especie</option>
                    <option value="Desconocido">Desconocido</option>
                    {SPECIES_CATEGORIES.map(category => (
                      <optgroup key={category.label} label={category.label}>
                        {category.options.map((species: string) => (
                          <option key={species} value={species}>{species}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Variety */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Variedad
                  </label>
                  <input
                    type="text"
                    value={formData.variety}
                    onChange={(e) => setFormData(prev => ({ ...prev, variety: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Cherry"
                  />
                </div>

                {/* Rootstock */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Portainjerto
                  </label>
                  <input
                    type="text"
                    value={formData.rootstock}
                    onChange={(e) => setFormData(prev => ({ ...prev, rootstock: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Mahaleb, Gisela 6"
                  />
                </div>

                {/* Planting Year */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Año de plantación
                  </label>
                  <input
                    type="number"
                    min="1950"
                    max={new Date().getFullYear()}
                    value={formData.planting_year}
                    onChange={(e) => setFormData(prev => ({ ...prev, planting_year: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="2023"
                  />
                </div>

                {/* Previous Crop */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Cultivo anterior
                  </label>
                  <select
                    value={formData.previous_crop}
                    onChange={(e) => setFormData(prev => ({ ...prev, previous_crop: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Sin cultivo anterior</option>
                    <option value="Barbecho">Barbecho</option>
                    <option value="Desconocido">Desconocido</option>
                    {SPECIES_CATEGORIES.map(category => (
                      <optgroup key={`prev-${category.label}`} label={category.label}>
                        {category.options.map((species: string) => (
                          <option key={`prev-${species}`} value={species}>{species}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Next Crop */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Próximo cultivo
                  </label>
                  <select
                    value={formData.next_crop}
                    onChange={(e) => setFormData(prev => ({ ...prev, next_crop: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Sin próximo cultivo planificado</option>
                    <option value="Barbecho">Barbecho</option>
                    <option value="Desconocido">Desconocido</option>
                    {SPECIES_CATEGORIES.map(category => (
                      <optgroup key={`next-${category.label}`} label={category.label}>
                        {category.options.map((species: string) => (
                          <option key={`next-${species}`} value={species}>{species}</option>
                        ))}
                      </optgroup>
                    ))}
                  </select>
                </div>

                {/* Fallow */}
                <div>
                  <label className="flex items-center">
                    <input
                      type="checkbox"
                      checked={formData.fallow}
                      onChange={(e) => setFormData(prev => ({ ...prev, fallow: e.target.checked }))}
                      className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span className="ml-2 text-sm text-gray-700">Terreno en barbecho</span>
                  </label>
                </div>


                {/* Delivery Info Section */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información de entrega</h4>
                </div>

                {/* Taken By */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Recolectada por
                  </label>
                    <select
                      value={formData.taken_by}
                      onChange={(e) => setFormData(prev => ({ ...prev, taken_by: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    >
                    <option value="client">Cliente</option>
                    <option value="lab">Laboratorio</option>
                  </select>
                </div>

                {/* Delivery Method */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Método de entrega
                  </label>
                  <select
                    value={formData.delivery_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar método</option>
                    <option value="Entrega directa">Entrega directa</option>
                    <option value="Courier">Courier</option>
                    <option value="Transporte propio">Transporte propio</option>
                  </select>
                </div>

                {/* Analysis Section */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Información del análisis</h4>
                </div>

                {/* Suspected Pathogen */}
                <div className="sm:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patógeno sospechoso
                  </label>
                  <select
                    value={formData.suspected_pathogen}
                    onChange={(e) => setFormData(prev => ({ ...prev, suspected_pathogen: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar patógeno</option>
                    {availableAnalytes.map((analyte) => (
                      <option key={analyte.id} value={analyte.scientific_name}>
                        {analyte.scientific_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Analysis Types - Show in create mode and edit mode (read-only in edit) */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Tipo de análisis *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {analysisOptions.types.map(type => (
                      <label key={type} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.analysis_types.includes(type)}
                          onChange={(e) => handleAnalysisTypeChange(type, e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">
                          {type}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>


                {/* Notes Section */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Notas y observaciones</h4>
                </div>

                {/* Client Notes */}
                <div className="sm:col-span-2 lg:col-span-1">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas del cliente
                  </label>
                  <textarea
                    rows={3}
                    value={formData.client_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Información adicional proporcionada por el cliente..."
                  />
                </div>

                {/* Reception Notes */}
                <div className="sm:col-span-2 lg:col-span-2">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas de recepción
                  </label>
                  <textarea
                    rows={3}
                    value={formData.reception_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, reception_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Observaciones del laboratorio al recibir la muestra..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-indigo-600 text-base font-medium text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creando...
                  </>
                ) : (
                  'Crear muestra'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* Create Client Modal - z-[60] to appear above sample modal (z-50) */}
      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => {
          setShowCreateClientModal(false)
          // Reset dropdown to empty value only if no client was selected before
          if (!formData.client_id) {
            setFormData(prev => ({ ...prev, client_id: '' }))
          }
        }}
        onSuccess={async (clientId) => {
          // Refresh clients list
          await fetchClients()
          // Select the newly created client
          if (clientId) {
            setFormData(prev => ({ ...prev, client_id: clientId }))
          }
          setShowCreateClientModal(false)
        }}
      />

      {/* Create Project Modal - z-[60] to appear above sample modal (z-50) */}
      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => {
          setShowCreateProjectModal(false)
          // Reset dropdown to empty value only if no project was selected before
          if (!formData.project_id && !formData.project) {
            setFormData(prev => ({ ...prev, project: '', project_id: '' }))
          }
        }}
        onSuccess={async (projectId) => {
          // Refresh projects list
          await fetchProjects()
          // Select the newly created project
          if (projectId) {
            setFormData(prev => ({ ...prev, project: projectId, project_id: projectId }))
          }
          setShowCreateProjectModal(false)
        }}
      />
    </div>
  )
}