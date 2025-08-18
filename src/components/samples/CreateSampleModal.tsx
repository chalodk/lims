'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useAuth } from '@/hooks/useAuth'
import { Client } from '@/types/database'
import { SPECIES_CATEGORIES } from '@/constants/species'
import { PROJECT_OPTIONS } from '@/constants/projects'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    client_id: '',
    code: '',
    received_date: new Date().toISOString().split('T')[0],
    priority: 'normal',
    project: '',
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
    analysis_types: [] as string[],
    methodologies: [] as string[],
    identification_techniques: [] as string[]
  })
  
  const supabase = createClient()

  const fetchClients = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    }
  }, [supabase])

  const generateSampleCode = useCallback(() => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000).toString().padStart(3, '0')
    setFormData(prev => ({ ...prev, code: `LIM-${year}-${randomNum}` }))
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      generateSampleCode()
    }
  }, [isOpen, fetchClients, generateSampleCode])

  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      analysis_types: checked 
        ? [...prev.analysis_types, type]
        : prev.analysis_types.filter(t => t !== type)
    }))
  }

  const handleMethodologyChange = (methodology: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      methodologies: checked 
        ? [...prev.methodologies, methodology]
        : prev.methodologies.filter(m => m !== methodology)
    }))
  }

  const handleIdentificationTechniqueChange = (technique: string, checked: boolean) => {
    setFormData(prev => ({
      ...prev,
      identification_techniques: checked 
        ? [...prev.identification_techniques, technique]
        : prev.identification_techniques.filter(t => t !== technique)
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (formData.analysis_types.length === 0 || formData.methodologies.length === 0 || formData.identification_techniques.length === 0) {
        alert('Debe seleccionar al menos una opción de cada sección: Tipo de análisis, Metodología y Técnica de identificación')
        return
      }

      // Combine all analysis selections into the requested_tests field
      const combinedTests = [
        ...formData.analysis_types.map(type => `Tipo: ${type}`),
        ...formData.methodologies.map(method => `Metodología: ${method}`),
        ...formData.identification_techniques.map(tech => `Identificación: ${tech}`)
      ]

      const { error } = await supabase
        .from('samples')
        .insert([
          {
            client_id: formData.client_id,
            code: formData.code,
            received_date: formData.received_date,
            priority: formData.priority,
            project: formData.project || null,
            species: formData.species,
            variety: formData.variety || null,
            planting_year: formData.planting_year ? parseInt(formData.planting_year) : null,
            previous_crop: formData.previous_crop || null,
            next_crop: formData.next_crop || null,
            fallow: formData.fallow,
            client_notes: formData.client_notes || null,
            reception_notes: formData.reception_notes || null,
            taken_by: formData.taken_by,
            delivery_method: formData.delivery_method || null,
            suspected_pathogen: formData.suspected_pathogen || null,
            requested_tests: combinedTests,
            company_id: user?.company_id,
          }
        ])

      if (error) throw error

      onSuccess()
      onClose()
      
      // Reset form
      setFormData({
        client_id: '',
        code: '',
        received_date: new Date().toISOString().split('T')[0],
        priority: 'normal',
        project: '',
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
        analysis_types: [],
        methodologies: [],
        identification_techniques: []
      })
    } catch (error: unknown) {
      console.error('Error creating sample:', error)
      alert('Error al crear la muestra: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen) return null

  const analysisOptions = {
    types: [
      'Nematológico',
      'Fitopatológico', 
      'Virológico',
      'Entomológico',
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
                  className="rounded-md text-gray-400 hover:text-gray-600"
                >
                  <X className="h-6 w-6" />
                </button>
              </div>

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

                {/* Priority */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Prioridad
                  </label>
                  <select
                    value={formData.priority}
                    onChange={(e) => setFormData(prev => ({ ...prev, priority: e.target.value }))}
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
                    value={formData.project}
                    onChange={(e) => setFormData(prev => ({ ...prev, project: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                  >
                    <option value="">Seleccionar proyecto</option>
                    {PROJECT_OPTIONS.map(project => (
                      <option key={project} value={project}>{project}</option>
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
                  <input
                    type="text"
                    value={formData.delivery_method}
                    onChange={(e) => setFormData(prev => ({ ...prev, delivery_method: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Entrega directa, Courier, Transporte propio"
                  />
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
                  <input
                    type="text"
                    value={formData.suspected_pathogen}
                    onChange={(e) => setFormData(prev => ({ ...prev, suspected_pathogen: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                    placeholder="Ej: Phytophthora infestans"
                  />
                </div>

                {/* Analysis Types */}
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
                        <span className="ml-2 text-sm text-gray-700">{type}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Methodologies */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Metodología *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
                    {analysisOptions.methodologies.map(methodology => (
                      <label key={methodology} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.methodologies.includes(methodology)}
                          onChange={(e) => handleMethodologyChange(methodology, e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{methodology}</span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Identification Techniques */}
                <div className="sm:col-span-2 lg:col-span-3">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Técnica de identificación *
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-3 mb-6">
                    {analysisOptions.identificationTechniques.map(technique => (
                      <label key={technique} className="flex items-center">
                        <input
                          type="checkbox"
                          checked={formData.identification_techniques.includes(technique)}
                          onChange={(e) => handleIdentificationTechniqueChange(technique, e.target.checked)}
                          className="rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="ml-2 text-sm text-gray-700">{technique}</span>
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
                className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
              >
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
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
    </div>
  )
}