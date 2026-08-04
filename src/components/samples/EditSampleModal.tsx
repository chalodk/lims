'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/hooks/useAuth'
import { SampleWithClient, Client, SLAStatus, SampleStatus, SLAType, SampleTakenBy, AreaType } from '@/types/database'
import { SPECIES_CATEGORIES } from '@/constants/species'
import { PROJECT_OPTIONS } from '@/constants/projects'
import { canEditField } from '@/config/sampleEditRules'
import { getLabelFromDbArea, getAllLabels } from '@/config/analysisTypes'
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
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'
import { cn } from '@/lib/utils'
import { TestTube, Loader2 } from 'lucide-react'

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
  const [hasValidatedResults, setHasValidatedResults] = useState(false)
  const [isCheckingValidated, setIsCheckingValidated] = useState(false)
  
  const supabase = getSupabaseClient()
  
  // Initialize form data with all fields from sample
  const [formData, setFormData] = useState({
    client_id: sample.client_id || '',
    code: sample.code || '',
    received_date: sample.received_date ? sample.received_date.split('T')[0] : new Date().toISOString().split('T')[0],
    sla_type: sample.sla_type || 'normal',
    project_id: (sample as SampleWithClient).project_id || '',
    species: sample.species || '',
    variety: sample.variety || '',
    rootstock: sample.rootstock || '',
    organo_analizado: (sample as SampleWithClient).organo_analizado || '',
    planting_year: sample.planting_year?.toString() || '',
    previous_crop: sample.previous_crop || '',
    next_crop: sample.next_crop || '',
    fallow: sample.fallow || false,
    client_notes: sample.client_notes || '',
    reception_notes: sample.reception_notes || '',
    taken_by: sample.taken_by || 'client',
    sampling_method: sample.sampling_method || '',
    suspected_pathogen: sample.suspected_pathogen || '',
    region: (sample as SampleWithClient).region || '',
    locality: (sample as SampleWithClient).locality || '',
    sampling_observations: (sample as SampleWithClient).sampling_observations || '',
    reception_observations: (sample as SampleWithClient).reception_observations || '',
    due_date: (sample as SampleWithClient).due_date?.split('T')[0] || '',
    sla_status: (sample as SampleWithClient).sla_status || 'on_time',
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
          project_id: (sample as SampleWithClient).project_id || '',
          species: sample.species || '',
          variety: sample.variety || '',
          rootstock: sample.rootstock || '',
          organo_analizado: (sample as SampleWithClient).organo_analizado || '',
          planting_year: sample.planting_year?.toString() || '',
          previous_crop: sample.previous_crop || '',
          next_crop: sample.next_crop || '',
          fallow: sample.fallow || false,
          client_notes: sample.client_notes || '',
          reception_notes: sample.reception_notes || '',
          taken_by: sample.taken_by || 'client',
          sampling_method: sample.sampling_method || '',
          suspected_pathogen: sample.suspected_pathogen || '',
          region: (sample as SampleWithClient).region || '',
          locality: (sample as SampleWithClient).locality || '',
          sampling_observations: (sample as SampleWithClient).sampling_observations || '',
          reception_observations: (sample as SampleWithClient).reception_observations || '',
          due_date: (sample as SampleWithClient).due_date?.split('T')[0] || '',
          sla_status: (sample as SampleWithClient).sla_status || 'on_time',
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

  // Check if sample has validated results
  const checkValidatedResults = useCallback(async (sampleId: string) => {
    try {
      setIsCheckingValidated(true)
      const { data, error } = await supabase
        .from('results')
        .select('id, status')
        .eq('sample_id', sampleId)
        .eq('status', 'validated')
        .limit(1)

      if (error) {
        console.error('Error checking validated results:', error)
        return false
      }

      return (data && data.length > 0)
    } catch (error) {
      console.error('Error checking validated results:', error)
      return false
    } finally {
      setIsCheckingValidated(false)
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen) {
      fetchClients()
      fetchProjects()
      loadAnalytes()
      
      // Check for validated results
      if (sample?.id) {
        checkValidatedResults(sample.id).then(hasValidated => {
          setHasValidatedResults(hasValidated)
          if (hasValidated) {
            setValidationError(
              'Esta muestra tiene resultados validados. ' +
              'Algunos campos están bloqueados para mantener la integridad de los datos. ' +
              'Puedes editar: Estado, Estado SLA, Fecha de vencimiento y todas las notas/observaciones.'
            )
          }
        })
      }
    } else {
      // Reset when modal closes
      setHasValidatedResults(false)
      setValidationError(null)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen, sample?.id])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setValidationError(null)
    setIsSubmitting(true)

    try {
      // ✅ Construir el body según si hay resultados validados o no
      let requestBody: Record<string, unknown>
      
      if (hasValidatedResults) {
        // ✅ Cuando hay resultados validados, SOLO enviar campos permitidos que realmente cambiaron
        requestBody = {}
        
        // Obtener valores originales para comparar
        const originalStatus = sample.status || 'received'
        const originalSlaStatus = (sample as SampleWithClient).sla_status || 'on_time'
        const sampleDueDate = (sample as SampleWithClient).due_date
        const originalDueDate = sampleDueDate && typeof sampleDueDate === 'string'
          ? sampleDueDate.split('T')[0] 
          : ''
        const originalClientNotes = sample.client_notes || ''
        const originalReceptionNotes = sample.reception_notes || ''
        const originalSamplingObservations = (sample as SampleWithClient).sampling_observations || ''
        const originalReceptionObservations = (sample as SampleWithClient).reception_observations || ''
        
        // Solo incluir campos permitidos si realmente cambiaron
        if (formData.status !== undefined && formData.status !== originalStatus) {
          requestBody.status = formData.status
        }
        if (formData.sla_status !== undefined && formData.sla_status !== originalSlaStatus) {
          requestBody.sla_status = formData.sla_status
        }
        if (formData.due_date !== undefined && formData.due_date !== originalDueDate) {
          requestBody.due_date = formData.due_date || null
        }
        if (formData.client_notes !== undefined) {
          const trimmedNotes = formData.client_notes.trim()
          if (trimmedNotes !== originalClientNotes) {
            requestBody.client_notes = trimmedNotes || null
          }
        }
        if (formData.reception_notes !== undefined) {
          const trimmedNotes = formData.reception_notes.trim()
          if (trimmedNotes !== originalReceptionNotes) {
            requestBody.reception_notes = trimmedNotes || null
          }
        }
        if (formData.sampling_observations !== undefined) {
          const trimmedNotes = formData.sampling_observations.trim()
          if (trimmedNotes !== originalSamplingObservations) {
            requestBody.sampling_observations = trimmedNotes || null
          }
        }
        if (formData.reception_observations !== undefined) {
          const trimmedNotes = formData.reception_observations.trim()
          if (trimmedNotes !== originalReceptionObservations) {
            requestBody.reception_observations = trimmedNotes || null
          }
        }
        
        // Verificar que al menos un campo permitido haya cambiado
        if (Object.keys(requestBody).length === 0) {
          setValidationError('No hay cambios para guardar. Solo se pueden editar: Estado, Estado SLA, Fecha de vencimiento y Notas.')
          setIsSubmitting(false)
          return
        }
      } else {
        // ✅ Cuando NO hay resultados validados, validar campos requeridos y enviar todos
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

        // Construir body completo cuando no hay resultados validados
        requestBody = {
          client_id: formData.client_id,
          code: formData.code.trim(),
          received_date: formData.received_date,
          sla_type: formData.sla_type,
          project_id: formData.project_id || null,
          species: formData.species.trim(),
          variety: formData.variety.trim() || null,
          rootstock: formData.rootstock.trim() || null,
          organo_analizado: formData.organo_analizado.trim() || null,
          planting_year: formData.planting_year ? parseInt(formData.planting_year) : null,
          previous_crop: formData.previous_crop || null,
          next_crop: formData.next_crop || null,
          fallow: formData.fallow,
          client_notes: formData.client_notes.trim() || null,
          reception_notes: formData.reception_notes.trim() || null,
          taken_by: formData.taken_by,
          sampling_method: formData.sampling_method.trim() || null,
          suspected_pathogen: formData.suspected_pathogen.trim() || null,
          region: formData.region.trim() || null,
          locality: formData.locality.trim() || null,
          sampling_observations: formData.sampling_observations.trim() || null,
          reception_observations: formData.reception_observations.trim() || null,
          sla_status: formData.sla_status,
          status: formData.status
        }
      }

      const response = await fetch(`/api/samples/${sample.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestBody)
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
    <Dialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open && !isSubmitting) onClose()
      }}
    >
      <DialogContent
        showCloseButton={!isSubmitting}
        className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <TestTube className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Editar muestra</DialogTitle>
              <DialogDescription className="mt-1">
                Modifica la información de {sample.code}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            {validationError ? (
              <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                <p className="font-medium">{validationError}</p>
                {hasValidatedResults ? (
                  <p className="mt-1 text-xs text-red-600">
                    Puedes editar: Estado, Estado SLA, Fecha de vencimiento y notas/observaciones.
                  </p>
                ) : null}
              </div>
            ) : null}

            {isCheckingValidated ? (
              <div className="flex items-center justify-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                <span className="ml-2 text-sm text-muted-foreground">
                  Verificando estado de la muestra...
                </span>
              </div>
            ) : (
              <>
                <FormSection
                  step={1}
                  title="Identificación"
                  description="Cliente, código, fechas y estado operativo"
                >
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Cliente" required className="sm:col-span-2">
                      <select
                        required
                        value={formData.client_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, client_id: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('client_id', hasValidatedResults)}
                      >
                        <option value="">Seleccionar cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>{client.name}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Código de muestra" required>
                      <Input
                        type="text"
                        required
                        value={formData.code}
                        onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('code', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Estado">
                      <select
                        value={formData.status || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, status: e.target.value as SampleStatus }))}
                        className={fieldClassName}
                        disabled={!canEditField('status', hasValidatedResults)}
                      >
                        {statusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Fecha de recepción" required>
                      <Input
                        type="date"
                        required
                        value={formData.received_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, received_date: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('received_date', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Fecha de vencimiento">
                      <Input
                        type="date"
                        value={formData.due_date}
                        onChange={(e) => setFormData((prev) => ({ ...prev, due_date: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('due_date', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Prioridad (SLA)">
                      <select
                        value={formData.sla_type || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sla_type: e.target.value as SLAType }))}
                        className={fieldClassName}
                        disabled={!canEditField('sla_type', hasValidatedResults)}
                      >
                        <option value="normal">Normal</option>
                        <option value="express">Express</option>
                      </select>
                    </Field>
                    <Field label="Estado SLA">
                      <select
                        value={formData.sla_status || ''}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sla_status: e.target.value as SLAStatus }))}
                        className={fieldClassName}
                        disabled={!canEditField('sla_status', hasValidatedResults)}
                      >
                        {slaStatusOptions.map((option) => (
                          <option key={option.value} value={option.value}>{option.label}</option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Proyecto" className="sm:col-span-2">
                      <select
                        value={formData.project_id}
                        onChange={(e) => setFormData((prev) => ({ ...prev, project_id: e.target.value }))}
                        className={fieldClassName}
                        disabled={isLoadingProjects || !canEditField('project_id', hasValidatedResults)}
                      >
                        <option value="">
                          {isLoadingProjects ? 'Cargando proyectos...' : 'Seleccionar proyecto'}
                        </option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>{project.name}</option>
                        ))}
                      </select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection step={2} title="Material vegetal" description="Especie, tejido y contexto agronómico">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    <Field label="Especie" required>
                      <select
                        required
                        value={formData.species}
                        onChange={(e) => setFormData((prev) => ({ ...prev, species: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('species', hasValidatedResults)}
                      >
                        <option value="">Seleccionar especie</option>
                        <option value="Desconocido">Desconocido</option>
                        {SPECIES_CATEGORIES.map((category) => (
                          <optgroup key={category.label} label={category.label}>
                            {category.options.map((species: string) => (
                              <option key={species} value={species}>{species}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                    <Field label="Variedad">
                      <Input
                        type="text"
                        value={formData.variety}
                        onChange={(e) => setFormData((prev) => ({ ...prev, variety: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('variety', hasValidatedResults)}
                        placeholder="Ej: Cherry"
                      />
                    </Field>
                    <Field label="Portainjerto">
                      <Input
                        type="text"
                        value={formData.rootstock}
                        onChange={(e) => setFormData((prev) => ({ ...prev, rootstock: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('rootstock', hasValidatedResults)}
                        placeholder="Ej: Mahaleb"
                      />
                    </Field>
                    <Field label="Tejido analizado">
                      <Input
                        type="text"
                        value={formData.organo_analizado}
                        onChange={(e) => setFormData((prev) => ({ ...prev, organo_analizado: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('organo_analizado', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Año de plantación">
                      <Input
                        type="number"
                        min="1950"
                        max={new Date().getFullYear()}
                        value={formData.planting_year}
                        onChange={(e) => setFormData((prev) => ({ ...prev, planting_year: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('planting_year', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Cultivo anterior">
                      <select
                        value={formData.previous_crop}
                        onChange={(e) => setFormData((prev) => ({ ...prev, previous_crop: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('previous_crop', hasValidatedResults)}
                      >
                        <option value="">Sin cultivo anterior</option>
                        <option value="Barbecho">Barbecho</option>
                        <option value="Desconocido">Desconocido</option>
                        {SPECIES_CATEGORIES.map((category) => (
                          <optgroup key={`prev-${category.label}`} label={category.label}>
                            {category.options.map((species: string) => (
                              <option key={`prev-${species}`} value={species}>{species}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                    <Field label="Próximo cultivo">
                      <select
                        value={formData.next_crop}
                        onChange={(e) => setFormData((prev) => ({ ...prev, next_crop: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('next_crop', hasValidatedResults)}
                      >
                        <option value="">Sin próximo cultivo planificado</option>
                        <option value="Barbecho">Barbecho</option>
                        <option value="Desconocido">Desconocido</option>
                        {SPECIES_CATEGORIES.map((category) => (
                          <optgroup key={`next-${category.label}`} label={category.label}>
                            {category.options.map((species: string) => (
                              <option key={`next-${species}`} value={species}>{species}</option>
                            ))}
                          </optgroup>
                        ))}
                      </select>
                    </Field>
                    <div className="flex items-end pb-1">
                      <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                        <input
                          type="checkbox"
                          checked={formData.fallow}
                          onChange={(e) => setFormData((prev) => ({ ...prev, fallow: e.target.checked }))}
                          className="rounded border-gray-300 text-green-600 focus:ring-green-600 disabled:opacity-50"
                          disabled={!canEditField('fallow', hasValidatedResults)}
                        />
                        Terreno en barbecho
                      </label>
                    </div>
                    <Field label="Región">
                      <Input
                        type="text"
                        value={formData.region}
                        onChange={(e) => setFormData((prev) => ({ ...prev, region: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('region', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Localidad">
                      <Input
                        type="text"
                        value={formData.locality}
                        onChange={(e) => setFormData((prev) => ({ ...prev, locality: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('locality', hasValidatedResults)}
                      />
                    </Field>
                  </div>
                </FormSection>

                <FormSection step={3} title="Muestreo" description="Cómo y quién tomó la muestra">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Recolectada por">
                      <select
                        value={formData.taken_by}
                        onChange={(e) => setFormData((prev) => ({ ...prev, taken_by: e.target.value as SampleTakenBy }))}
                        className={fieldClassName}
                        disabled={!canEditField('taken_by', hasValidatedResults)}
                      >
                        <option value="client">Cliente</option>
                        <option value="lab">Laboratorio</option>
                      </select>
                    </Field>
                    <Field label="Método de muestreo">
                      <select
                        value={formData.sampling_method}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sampling_method: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('sampling_method', hasValidatedResults)}
                      >
                        <option value="">No especificado</option>
                        <option value="Muestra compuesta">Muestra compuesta</option>
                      </select>
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  step={4}
                  title="Análisis"
                  description="Patógeno sospechado y tipos asignados (solo lectura)"
                  className="border-green-100 bg-green-50/40"
                >
                  <div className="space-y-4">
                    <Field label="Patógeno sospechado">
                      <select
                        value={formData.suspected_pathogen}
                        onChange={(e) => setFormData((prev) => ({ ...prev, suspected_pathogen: e.target.value }))}
                        className={fieldClassName}
                        disabled={!canEditField('suspected_pathogen', hasValidatedResults)}
                      >
                        <option value="">Seleccionar patógeno</option>
                        {availableAnalytes.map((analyte) => (
                          <option key={analyte.id} value={analyte.scientific_name}>
                            {analyte.scientific_name}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <div className="space-y-2">
                      <p className="text-sm font-medium text-gray-700">Tipo de análisis</p>
                      {(() => {
                        let analysisTypes: string[] = []
                        const extendedSample = sample as SampleWithClient
                        if (extendedSample?.sample_tests && Array.isArray(extendedSample.sample_tests) && extendedSample.sample_tests.length > 0) {
                          const uniqueAreas = new Set(
                            extendedSample.sample_tests
                              .map((st) => st.test_catalog?.area)
                              .filter((area): area is AreaType => {
                                if (!area) return false
                                const label = getLabelFromDbArea(area as AreaType)
                                return label !== area
                              })
                          )
                          analysisTypes = Array.from(uniqueAreas)
                            .map((area: AreaType) => getLabelFromDbArea(area))
                            .filter((name): name is string => typeof name === 'string')
                        }
                        const allTypes = getAllLabels()
                        return (
                          <>
                            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                              {allTypes.map((type) => {
                                const isChecked = analysisTypes.includes(type)
                                return (
                                  <label
                                    key={type}
                                    className={cn(
                                      'flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-sm',
                                      isChecked
                                        ? 'border-green-300 bg-green-50/80 text-green-900'
                                        : 'border-gray-200 bg-white text-gray-400'
                                    )}
                                  >
                                    <input
                                      type="checkbox"
                                      checked={isChecked}
                                      disabled
                                      className="rounded border-gray-300 text-green-600 opacity-70"
                                    />
                                    {type}
                                  </label>
                                )
                              })}
                            </div>
                            <p className="text-xs text-muted-foreground">
                              {analysisTypes.length > 0
                                ? 'Los tipos de análisis no se pueden modificar después de crear la muestra'
                                : 'No se han asignado tipos de análisis a esta muestra'}
                            </p>
                          </>
                        )
                      })()}
                    </div>
                  </div>
                </FormSection>

                <FormSection step={5} title="Notas" description="Observaciones editables">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <Field label="Notas del cliente">
                      <textarea
                        rows={3}
                        value={formData.client_notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, client_notes: e.target.value }))}
                        className={textareaClassName}
                        disabled={!canEditField('client_notes', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Notas de recepción">
                      <textarea
                        rows={3}
                        value={formData.reception_notes}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reception_notes: e.target.value }))}
                        className={textareaClassName}
                        disabled={!canEditField('reception_notes', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Observaciones de muestreo">
                      <textarea
                        rows={3}
                        value={formData.sampling_observations}
                        onChange={(e) => setFormData((prev) => ({ ...prev, sampling_observations: e.target.value }))}
                        className={textareaClassName}
                        disabled={!canEditField('sampling_observations', hasValidatedResults)}
                      />
                    </Field>
                    <Field label="Observaciones de recepción">
                      <textarea
                        rows={3}
                        value={formData.reception_observations}
                        onChange={(e) => setFormData((prev) => ({ ...prev, reception_observations: e.target.value }))}
                        className={textareaClassName}
                        disabled={!canEditField('reception_observations', hasValidatedResults)}
                      />
                    </Field>
                  </div>
                </FormSection>
              </>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={isSubmitting} onClick={onClose}>
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || isCheckingValidated} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

