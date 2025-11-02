'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, Client } from '@/types/database'
import { SPECIES_CATEGORIES } from '@/constants/species'
import { PROJECT_OPTIONS } from '@/constants/projects'
import { 
  TestTube, 
  Loader2,
  X
} from 'lucide-react'

interface EditSampleModalProps {
  isOpen: boolean
  onClose: () => void
  sample: SampleWithClient
  onSuccess: () => void
}

export default function EditSampleModal({ isOpen, onClose, sample, onSuccess }: EditSampleModalProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Array<{id: string, name: string}>>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableAnalytes, setAvailableAnalytes] = useState<Array<{id: string, scientific_name: string}>>([])
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const supabase = getSupabaseClient()

  // Initialize form data with all fields from sample
  const [formData, setFormData] = useState({
    client_id: sample.client_id || '',
    code: sample.code || '',
    received_date: sample.received_date ? sample.received_date.split('T')[0] : new Date().toISOString().split('T')[0],
    sla_type: sample.sla_type || 'normal',
    project_id: (sample as any).project_id || '',
    species: sample.species || '',
    variety: sample.variety || '',
    rootstock: sample.rootstock || '',
    planting_year: sample.planting_year?.toString() || '',
    previous_crop: sample.previous_crop || '',
    next_crop: sample.next_crop || '',
    fallow: sample.fallow || false,
    client_notes: sample.client_notes || '',
    reception_notes: sample.reception_notes || '',
    taken_by: sample.taken_by || 'client',
    delivery_method: sample.delivery_method || '',
    suspected_pathogen: sample.suspected_pathogen || '',
    region: (sample as any).region || '',
    locality: (sample as any).locality || '',
    sampling_observations: (sample as any).sampling_observations || '',
    reception_observations: (sample as any).reception_observations || '',
    due_date: (sample as any).due_date ? (sample as any).due_date.split('T')[0] : '',
    sla_status: (sample as any).sla_status || 'on_time',
    status: sample.status || 'received'
  })

  // Reload form data when sample changes
  useEffect(() => {
    if (isOpen && sample) {
      setFormData({
        client_id: sample.client_id || '',
        code: sample.code || '',
        received_date: sample.received_date ? sample.received_date.split('T')[0] : new Date().toISOString().split('T')[0],
        sla_type: sample.sla_type || 'normal',
        project_id: (sample as any).project_id || '',
        species: sample.species || '',
        variety: sample.variety || '',
        rootstock: sample.rootstock || '',
        planting_year: sample.planting_year?.toString() || '',
        previous_crop: sample.previous_crop || '',
        next_crop: sample.next_crop || '',
        fallow: sample.fallow || false,
        client_notes: sample.client_notes || '',
        reception_notes: sample.reception_notes || '',
        taken_by: sample.taken_by || 'client',
        delivery_method: sample.delivery_method || '',
        suspected_pathogen: sample.suspected_pathogen || '',
        region: (sample as any).region || '',
        locality: (sample as any).locality || '',
        sampling_observations: (sample as any).sampling_observations || '',
        reception_observations: (sample as any).reception_observations || '',
        due_date: (sample as any).due_date ? (sample as any).due_date.split('T')[0] : '',
        sla_status: (sample as any).sla_status || 'on_time',
        status: sample.status || 'received'
      })
      setValidationError(null)
    }
  }, [isOpen, sample])

  const fetchClients = useCallback(async () => {
    try {
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
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        const fallbackProjects = PROJECT_OPTIONS.map((name, index) => ({
          id: `fallback-${index}`,
          name: name
        }))
        setProjects(fallbackProjects)
        return
      }
      
      if (!data || data.length === 0) {
        const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
          id: name,
          name: name
        }))
        setProjects(fallbackProjects)
      } else {
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
        id: name,
        name: name
      }))
      setProjects(fallbackProjects)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [supabase])

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
    }
  }, [isOpen, fetchClients, fetchProjects, loadAnalytes])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setIsSubmitting(true)

    try {
      // Validation: Required fields
      if (!formData.client_id) {
        throw new Error('El campo Cliente es obligatorio')
      }
      if (!formData.code?.trim()) {
        throw new Error('El campo Código es obligatorio')
      }
      if (!formData.received_date) {
        throw new Error('El campo Fecha de recepción es obligatorio')
      }
      if (!formData.species?.trim()) {
        throw new Error('El campo Especie es obligatorio')
      }

      // Validation: CHECK constraints
      if (formData.taken_by && !['client', 'lab'].includes(formData.taken_by)) {
        throw new Error('El campo "Recolectada por" debe ser "Cliente" o "Laboratorio"')
      }
      if (formData.status && !['received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis', 'validation', 'completed'].includes(formData.status)) {
        throw new Error('Estado de muestra inválido')
      }
      if (formData.sla_type && !['normal', 'express'].includes(formData.sla_type)) {
        throw new Error('Tipo de SLA inválido')
      }
      if (formData.sla_status && !['on_time', 'at_risk', 'breached'].includes(formData.sla_status)) {
        throw new Error('Estado de SLA inválido')
      }

      const response = await fetch(`/api/samples/${sample.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: formData.client_id,
          code: formData.code.trim(),
          received_date: formData.received_date,
          sla_type: formData.sla_type,
          project_id: formData.project_id || null,
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
          sla_status: formData.sla_status,
          status: formData.status
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al actualizar la muestra'
        
        // Handle specific database errors
        if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key')) {
          throw new Error('Error: El cliente o proyecto seleccionado no existe. Por favor, verifica la selección.')
        } else if (errorMessage.includes('duplicate key') || errorMessage.includes('unique constraint')) {
          throw new Error('Error: Ya existe una muestra con este código. Por favor, usa un código único.')
        } else if (errorMessage.includes('check constraint') || errorMessage.includes('CHECK')) {
          throw new Error('Error: Uno de los valores ingresados no es válido según las restricciones de la base de datos.')
        } else if (errorMessage.includes('null value') || errorMessage.includes('NOT NULL')) {
          throw new Error('Error: Algunos campos obligatorios están vacíos.')
        }
        
        throw new Error(errorMessage)
      }

      onSuccess()
      onClose()
    } catch (error: unknown) {
      console.error('Error updating sample:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido al actualizar la muestra'
      setValidationError(errorMessage)
      // Scroll to top to show error
      window.scrollTo({ top: 0, behavior: 'smooth' })
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const statusOptions = [
    { value: 'received', label: 'Recibida' },
    { value: 'processing', label: 'Procesando' },
    { value: 'microscopy', label: 'Microscopía' },
    { value: 'isolation', label: 'Aislamiento' },
    { value: 'identification', label: 'Identificación' },
    { value: 'molecular_analysis', label: 'Análisis Molecular' },
    { value: 'validation', label: 'Validación' },
    { value: 'completed', label: 'Completada' }
  ]

  const slaStatusOptions = [
    { value: 'on_time', label: 'A Tiempo' },
    { value: 'at_risk', label: 'En Riesgo' },
    { value: 'breached', label: 'Incumplido' }
  ]

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center">
                  <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                    <TestTube className="h-6 w-6 text-green-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg leading-6 font-medium text-gray-900">
                      Editar Muestra
                    </h3>
                    <p className="text-sm text-gray-500">
                      Modifica la información de la muestra {sample.code}
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

              {/* Validation Error Display */}
              {validationError && (
                <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-800">{validationError}</p>
                </div>
              )}

              <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
                {/* Basic Info Section */}
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
                    onChange={(e) => setFormData(prev => ({ ...prev, client_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar cliente</option>
                    {clients.map(client => (
                      <option key={client.id} value={client.id}>{client.name}</option>
                    ))}
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
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: LIM-2024-001"
                  />
                </div>

                {/* Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado
                  </label>
                  <select
                    value={formData.status || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {statusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
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

                {/* Due Date */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Fecha de vencimiento
                  </label>
                  <input
                    type="date"
                    value={formData.due_date}
                    onChange={(e) => setFormData(prev => ({ ...prev, due_date: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  />
                </div>

                {/* SLA Type */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad (SLA)
                  </label>
                  <select
                    value={formData.sla_type || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sla_type: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="normal">Normal</option>
                    <option value="express">Express</option>
                  </select>
                </div>

                {/* SLA Status */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Estado SLA
                  </label>
                  <select
                    value={formData.sla_status || ''}
                    onChange={(e) => setFormData(prev => ({ ...prev, sla_status: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    {slaStatusOptions.map(option => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </div>

                {/* Project */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Proyecto
                  </label>
                  <select
                    value={formData.project_id}
                    onChange={(e) => setFormData(prev => ({ ...prev, project_id: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    disabled={isLoadingProjects}
                  >
                    <option value="">
                      {isLoadingProjects ? 'Cargando proyectos...' : 'Seleccionar proyecto'}
                    </option>
                    {projects.map(project => (
                      <option key={project.id} value={project.id}>{project.name}</option>
                    ))}
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

                {/* Location Section */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Ubicación</h4>
                </div>

                {/* Region */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Región
                  </label>
                  <input
                    type="text"
                    value={formData.region}
                    onChange={(e) => setFormData(prev => ({ ...prev, region: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Región Metropolitana"
                  />
                </div>

                {/* Locality */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Localidad
                  </label>
                  <input
                    type="text"
                    value={formData.locality}
                    onChange={(e) => setFormData(prev => ({ ...prev, locality: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Maipú, Santiago"
                  />
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
                  <input
                    type="text"
                    value={formData.delivery_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Entrega directa, Courier, Transporte propio"
                  />
                </div>

                {/* Suspected Pathogen */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Patógeno sospechado
                  </label>
                  <select
                    value={formData.suspected_pathogen}
                    onChange={(e) => setFormData(prev => ({ ...prev, suspected_pathogen: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar patógeno</option>
                    {availableAnalytes.map(analyte => (
                      <option key={analyte.id} value={analyte.scientific_name}>
                        {analyte.scientific_name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Notes Section */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <h4 className="text-md font-medium text-gray-900 mb-4 mt-6">Notas y observaciones</h4>
                </div>

                {/* Client Notes */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Notas del cliente
                  </label>
                  <textarea
                    rows={3}
                    value={formData.client_notes}
                    onChange={(e) => setFormData(prev => ({ ...prev, client_notes: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Notas proporcionadas por el cliente..."
                  />
                </div>

                {/* Reception Notes */}
                <div className="sm:col-span-2 lg:col-span-3">
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

                {/* Sampling Observations */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones de muestreo
                  </label>
                  <textarea
                    rows={3}
                    value={formData.sampling_observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, sampling_observations: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Observaciones sobre el proceso de muestreo..."
                  />
                </div>

                {/* Reception Observations */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Observaciones de recepción
                  </label>
                  <textarea
                    rows={3}
                    value={formData.reception_observations}
                    onChange={(e) => setFormData(prev => ({ ...prev, reception_observations: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Observaciones adicionales al recibir la muestra..."
                  />
                </div>
              </div>
            </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
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
    </div>
  )
}
