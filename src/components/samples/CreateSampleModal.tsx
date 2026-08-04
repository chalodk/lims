'use client'

import { useState, useEffect, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { useAuth } from '@/hooks/useAuth'
import { Client } from '@/types/database'
import { SPECIES_CATEGORIES } from '@/constants/species'
import { PROJECT_OPTIONS } from '@/constants/projects'
import { getAllLabels } from '@/config/analysisTypes'
import CreateClientModal from '@/components/clients/CreateClientModal'
import CreateProjectModal from '@/components/projects/CreateProjectModal'
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
import { Label } from '@/components/ui/label'
import { FormSection, Field } from '@/components/ui/form-section'
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'
import { cn } from '@/lib/utils'
import { TestTube, Loader2 } from 'lucide-react'

interface CreateSampleModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateSampleModal({ isOpen, onClose, onSuccess }: CreateSampleModalProps) {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [projects, setProjects] = useState<Array<{ id: string; name: string }>>([])
  const [isLoadingProjects, setIsLoadingProjects] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [availableAnalytes, setAvailableAnalytes] = useState<
    Array<{ id: string; scientific_name: string }>
  >([])
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
    organo_analizado: '',
    planting_year: '',
    previous_crop: '',
    next_crop: '',
    fallow: false,
    client_notes: '',
    reception_notes: '',
    taken_by: 'client',
    sampling_method: '',
    suspected_pathogen: '',
    region: '',
    locality: '',
    sampling_observations: '',
    reception_observations: '',
    due_date: '',
    sla_status: 'on_time',
    status: 'received',
    analysis_types: [] as string[],
  })

  const supabase = getSupabaseClient()

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
      console.log('Fetching projects...')
      const { data, error } = await supabase
        .from('projects')
        .select('id, name')
        .order('name', { ascending: true })

      if (error) {
        console.error('Supabase error:', error)
        console.log('Using fallback projects from constants')
        const fallbackProjects = PROJECT_OPTIONS.map((name, index) => ({
          id: `fallback-${index}`,
          name: name,
        }))
        setProjects(fallbackProjects)
        return
      }

      console.log('Projects data:', data)

      if (!data || data.length === 0) {
        console.log('No projects in database, using fallback from constants')
        const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
          id: name,
          name: name,
        }))
        setProjects(fallbackProjects)
      } else {
        setProjects(data)
      }
    } catch (error) {
      console.error('Error fetching projects:', error)
      const fallbackProjects = PROJECT_OPTIONS.map((name) => ({
        id: name,
        name: name,
      }))
      setProjects(fallbackProjects)
    } finally {
      setIsLoadingProjects(false)
    }
  }, [supabase])

  const generateSampleCode = useCallback(() => {
    const year = new Date().getFullYear()
    const randomNum = Math.floor(Math.random() * 1000)
      .toString()
      .padStart(3, '0')
    setFormData((prev) => ({ ...prev, code: `LIM-${year}-${randomNum}` }))
  }, [])

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
      setIsSubmitting(false)
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
        organo_analizado: '',
        planting_year: '',
        previous_crop: '',
        next_crop: '',
        fallow: false,
        client_notes: '',
        reception_notes: '',
        taken_by: 'client',
        sampling_method: '',
        suspected_pathogen: '',
        region: '',
        locality: '',
        sampling_observations: '',
        reception_observations: '',
        due_date: '',
        sla_status: 'on_time',
        status: 'received',
        analysis_types: [],
      })
      setValidationError(null)
    }
  }, [isOpen, fetchClients, fetchProjects, generateSampleCode, loadAnalytes])

  const handleAnalysisTypeChange = (type: string, checked: boolean) => {
    setFormData((prev) => ({
      ...prev,
      analysis_types: checked
        ? [...prev.analysis_types, type]
        : prev.analysis_types.filter((t) => t !== type),
    }))
  }

  const ensureFreshSessionQuietly = async (): Promise<boolean> => {
    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession()
      if (sessionError || !session) {
        const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
        return !refreshError && !!refreshed.session
      }
      const expiresAt = session.expires_at
      if (expiresAt) {
        const expiresInSeconds = expiresAt - Math.floor(Date.now() / 1000)
        if (expiresInSeconds < 120) {
          const { data: refreshed, error: refreshError } = await supabase.auth.refreshSession()
          return !refreshError && !!refreshed.session
        }
      }
      return true
    } catch (error) {
      console.error('Silent session refresh failed:', error)
      return false
    }
  }

  const postCreateSample = async (
    requestBody: Record<string, unknown>,
    signal: AbortSignal
  ): Promise<Response> => {
    return fetch('/api/samples', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
      signal,
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (isSubmitting) return

    setValidationError(null)
    setIsSubmitting(true)

    const abortController = new AbortController()
    const timeoutId = window.setTimeout(() => abortController.abort(), 60_000)

    try {
      if (formData.analysis_types.length === 0) {
        setValidationError('Debe seleccionar al menos un tipo de análisis')
        return
      }

      await ensureFreshSessionQuietly()

      const requestBody: Record<string, unknown> = {
        client_id: formData.client_id,
        code: formData.code.trim(),
        received_date: formData.received_date,
        sla_type: formData.sla_type,
        project_id: formData.project_id || formData.project || null,
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
      }

      requestBody.analysis_selections = {
        analysis_types: formData.analysis_types,
      }

      let response = await postCreateSample(requestBody, abortController.signal)

      if (response.status === 401) {
        const refreshed = await ensureFreshSessionQuietly()
        if (refreshed && !abortController.signal.aborted) {
          response = await postCreateSample(requestBody, abortController.signal)
        }
      }

      if (!response.ok) {
        let errorMessage = 'No se pudo crear la muestra. Intenta nuevamente.'
        try {
          const errorData = await response.json()
          if (typeof errorData.error === 'string' && errorData.error.trim()) {
            errorMessage = errorData.error
          }
        } catch {
          // ignore JSON parse errors
        }

        if (response.status === 401) {
          setValidationError('No se pudo crear la muestra. Intenta nuevamente.')
          return
        }

        if (errorMessage.includes('NOT NULL')) {
          setValidationError('Uno o más campos obligatorios estaban vacíos')
        } else if (errorMessage.includes('FOREIGN KEY')) {
          setValidationError('Uno de los valores seleccionados no existe en la base de datos')
        } else if (errorMessage.includes('CHECK')) {
          setValidationError('Uno de los valores seleccionados no es válido según las restricciones')
        } else if (
          errorMessage.toLowerCase().includes('unauthorized') ||
          errorMessage.toLowerCase().includes('sesión') ||
          errorMessage.toLowerCase().includes('session')
        ) {
          setValidationError('No se pudo crear la muestra. Intenta nuevamente.')
        } else {
          setValidationError(errorMessage)
        }
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
        organo_analizado: '',
        planting_year: '',
        previous_crop: '',
        next_crop: '',
        fallow: false,
        client_notes: '',
        reception_notes: '',
        taken_by: 'client',
        sampling_method: '',
        suspected_pathogen: '',
        region: '',
        locality: '',
        sampling_observations: '',
        reception_observations: '',
        due_date: '',
        sla_status: 'on_time',
        status: 'received',
        analysis_types: [],
      })
      setValidationError(null)
    } catch (error: unknown) {
      console.error('Error creating sample:', error)
      if (error instanceof DOMException && error.name === 'AbortError') {
        setValidationError(
          'La creación tardó demasiado. Verifica si la muestra se creó; si no, intenta nuevamente.'
        )
      } else {
        setValidationError('No se pudo crear la muestra. Intenta nuevamente.')
      }
    } finally {
      window.clearTimeout(timeoutId)
      setIsSubmitting(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (
      !open &&
      !isSubmitting &&
      !showCreateClientModal &&
      !showCreateProjectModal
    ) {
      setValidationError(null)
      onClose()
    }
  }

  const analysisTypes = getAllLabels()

  return (
    <>
      <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
        <DialogContent
          showCloseButton={!isSubmitting}
          className="flex max-h-[90vh] max-w-3xl flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
          onInteractOutside={(event) => {
            if (isSubmitting || showCreateClientModal || showCreateProjectModal) {
              event.preventDefault()
            }
          }}
          onEscapeKeyDown={(event) => {
            if (isSubmitting || showCreateClientModal || showCreateProjectModal) {
              event.preventDefault()
            }
          }}
        >
          <DialogHeader className="border-b border-gray-100 bg-white">
            <div className="flex items-start gap-3 pr-8">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <TestTube className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <DialogTitle>Nueva muestra</DialogTitle>
                <DialogDescription className="mt-1">
                  Completa los datos en orden. Los campos con * son obligatorios.
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
            <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
              {validationError ? (
                <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
                  {validationError}
                </div>
              ) : null}

              <FormSection
                step={1}
                title="Identificación"
                description="Quién envía la muestra y cómo se registra en el laboratorio"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Cliente" required className="sm:col-span-2">
                    <select
                      required
                      value={formData.client_id}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '__create_client__') {
                          setShowCreateClientModal(true)
                        } else {
                          setFormData((prev) => ({ ...prev, client_id: value }))
                        }
                      }}
                      className={fieldClassName}
                    >
                      <option value="">Seleccionar cliente</option>
                      {clients.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                      <option value="__create_client__">＋ Crear cliente</option>
                    </select>
                  </Field>

                  <Field label="Código de muestra" required>
                    <Input
                      type="text"
                      required
                      value={formData.code}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, code: e.target.value }))
                      }
                      className={fieldClassName}
                    />
                  </Field>

                  <Field label="Fecha de recepción" required>
                    <Input
                      type="date"
                      required
                      value={formData.received_date}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          received_date: e.target.value,
                        }))
                      }
                      className={fieldClassName}
                    />
                  </Field>

                  <Field label="Prioridad (SLA)">
                    <select
                      value={formData.sla_type}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, sla_type: e.target.value }))
                      }
                      className={fieldClassName}
                    >
                      <option value="normal">Normal</option>
                      <option value="express">Express</option>
                    </select>
                  </Field>

                  <Field label="Proyecto">
                    <select
                      value={formData.project_id || formData.project}
                      onChange={(e) => {
                        const value = e.target.value
                        if (value === '__create_project__') {
                          setShowCreateProjectModal(true)
                        } else {
                          setFormData((prev) => ({
                            ...prev,
                            project: value,
                            project_id: value,
                          }))
                        }
                      }}
                      className={fieldClassName}
                      disabled={isLoadingProjects}
                    >
                      <option value="">
                        {isLoadingProjects
                          ? 'Cargando proyectos...'
                          : 'Seleccionar proyecto'}
                      </option>
                      {projects.map((project) => (
                        <option key={project.id} value={project.id}>
                          {project.name}
                        </option>
                      ))}
                      <option value="__create_project__">＋ Crear proyecto</option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <FormSection
                step={2}
                title="Material vegetal"
                description="Especie, tejido y contexto agronómico de la muestra"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  <Field label="Especie" required>
                    <select
                      required
                      value={formData.species}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, species: e.target.value }))
                      }
                      className={fieldClassName}
                    >
                      <option value="">Seleccionar especie</option>
                      <option value="Desconocido">Desconocido</option>
                      {SPECIES_CATEGORIES.map((category) => (
                        <optgroup key={category.label} label={category.label}>
                          {category.options.map((species: string) => (
                            <option key={species} value={species}>
                              {species}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </Field>

                  <Field label="Variedad">
                    <Input
                      type="text"
                      value={formData.variety}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, variety: e.target.value }))
                      }
                      className={fieldClassName}
                      placeholder="Ej: Cherry"
                    />
                  </Field>

                  <Field label="Portainjerto">
                    <Input
                      type="text"
                      value={formData.rootstock}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, rootstock: e.target.value }))
                      }
                      className={fieldClassName}
                      placeholder="Ej: Mahaleb, Gisela 6"
                    />
                  </Field>

                  <Field label="Tejido analizado">
                    <Input
                      type="text"
                      value={formData.organo_analizado}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          organo_analizado: e.target.value,
                        }))
                      }
                      className={fieldClassName}
                      placeholder="Ej: Hoja, Fruto, Raíz"
                    />
                  </Field>

                  <Field label="Año de plantación">
                    <Input
                      type="number"
                      min="1950"
                      max={new Date().getFullYear()}
                      value={formData.planting_year}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          planting_year: e.target.value,
                        }))
                      }
                      className={fieldClassName}
                      placeholder="2023"
                    />
                  </Field>

                  <Field label="Cultivo anterior">
                    <select
                      value={formData.previous_crop}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          previous_crop: e.target.value,
                        }))
                      }
                      className={fieldClassName}
                    >
                      <option value="">Sin cultivo anterior</option>
                      <option value="Barbecho">Barbecho</option>
                      <option value="Desconocido">Desconocido</option>
                      {SPECIES_CATEGORIES.map((category) => (
                        <optgroup key={`prev-${category.label}`} label={category.label}>
                          {category.options.map((species: string) => (
                            <option key={`prev-${species}`} value={species}>
                              {species}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </Field>

                  <Field label="Próximo cultivo">
                    <select
                      value={formData.next_crop}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, next_crop: e.target.value }))
                      }
                      className={fieldClassName}
                    >
                      <option value="">Sin próximo cultivo planificado</option>
                      <option value="Barbecho">Barbecho</option>
                      <option value="Desconocido">Desconocido</option>
                      {SPECIES_CATEGORIES.map((category) => (
                        <optgroup key={`next-${category.label}`} label={category.label}>
                          {category.options.map((species: string) => (
                            <option key={`next-${species}`} value={species}>
                              {species}
                            </option>
                          ))}
                        </optgroup>
                      ))}
                    </select>
                  </Field>

                  <div className="flex items-end pb-1 sm:col-span-2 lg:col-span-1">
                    <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={formData.fallow}
                        onChange={(e) =>
                          setFormData((prev) => ({ ...prev, fallow: e.target.checked }))
                        }
                        className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                      />
                      Terreno en barbecho
                    </label>
                  </div>
                </div>
              </FormSection>

              <FormSection
                step={3}
                title="Muestreo"
                description="Cómo y quién tomó la muestra"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Recolectada por">
                    <select
                      value={formData.taken_by}
                      onChange={(e) =>
                        setFormData((prev) => ({ ...prev, taken_by: e.target.value }))
                      }
                      className={fieldClassName}
                    >
                      <option value="client">Cliente</option>
                      <option value="lab">Laboratorio</option>
                    </select>
                  </Field>

                  <Field label="Método de muestreo">
                    <select
                      value={formData.sampling_method}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          sampling_method: e.target.value,
                        }))
                      }
                      className={fieldClassName}
                    >
                      <option value="">No especificado</option>
                      <option value="Muestra compuesta">Muestra compuesta</option>
                    </select>
                  </Field>
                </div>
              </FormSection>

              <FormSection
                step={4}
                title="Análisis solicitado"
                description="Define qué se analizará en esta muestra"
                className="border-green-100 bg-green-50/40"
              >
                <div className="space-y-4">
                  <Field label="Patógeno sospechoso">
                    <select
                      value={formData.suspected_pathogen}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          suspected_pathogen: e.target.value,
                        }))
                      }
                      className={fieldClassName}
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
                    <Label className="text-sm font-medium text-gray-700">
                      Tipo de análisis <span className="text-green-700">*</span>
                    </Label>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {analysisTypes.map((type) => {
                        const isChecked = formData.analysis_types.includes(type)
                        return (
                          <label
                            key={type}
                            className={cn(
                              'flex cursor-pointer items-center gap-2.5 rounded-lg border bg-white px-3 py-2.5 text-sm',
                              isChecked
                                ? 'border-green-300 bg-green-50/80 text-green-900'
                                : 'border-gray-200 text-gray-700 hover:border-gray-300'
                            )}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={(e) =>
                                handleAnalysisTypeChange(type, e.target.checked)
                              }
                              className="rounded border-gray-300 text-green-600 focus:ring-green-600"
                            />
                            {type}
                          </label>
                        )
                      })}
                    </div>
                  </div>
                </div>
              </FormSection>

              <FormSection
                step={5}
                title="Notas"
                description="Contexto adicional opcional"
              >
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                  <Field label="Notas del cliente">
                    <textarea
                      rows={3}
                      value={formData.client_notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          client_notes: e.target.value,
                        }))
                      }
                      className={textareaClassName}
                      placeholder="Información adicional del cliente..."
                    />
                  </Field>

                  <Field label="Notas de recepción">
                    <textarea
                      rows={3}
                      value={formData.reception_notes}
                      onChange={(e) =>
                        setFormData((prev) => ({
                          ...prev,
                          reception_notes: e.target.value,
                        }))
                      }
                      className={textareaClassName}
                      placeholder="Observaciones al recibir la muestra..."
                    />
                  </Field>
                </div>
              </FormSection>
            </div>

            <DialogFooter>
              <Button
                type="button"
                variant="outline"
                disabled={isSubmitting}
                onClick={() => {
                  setIsSubmitting(false)
                  setValidationError(null)
                  onClose()
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="gap-2">
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear muestra'
                )}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <CreateClientModal
        isOpen={showCreateClientModal}
        onClose={() => {
          setShowCreateClientModal(false)
          if (!formData.client_id) {
            setFormData((prev) => ({ ...prev, client_id: '' }))
          }
        }}
        onSuccess={async (clientId) => {
          await fetchClients()
          if (clientId) {
            setFormData((prev) => ({ ...prev, client_id: clientId }))
          }
          setShowCreateClientModal(false)
        }}
      />

      <CreateProjectModal
        isOpen={showCreateProjectModal}
        onClose={() => {
          setShowCreateProjectModal(false)
          if (!formData.project_id && !formData.project) {
            setFormData((prev) => ({ ...prev, project: '', project_id: '' }))
          }
        }}
        onSuccess={async (projectId) => {
          await fetchProjects()
          if (projectId) {
            setFormData((prev) => ({
              ...prev,
              project: projectId,
              project_id: projectId,
            }))
          }
          setShowCreateProjectModal(false)
        }}
      />
    </>
  )
}
