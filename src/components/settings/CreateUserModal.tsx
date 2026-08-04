'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  UserPlus,
  Loader2,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sparkles,
  CheckCircle2,
  SkipForward,
  AlertCircle,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { FormSection, Field } from '@/components/ui/form-section'
import { fieldClassName } from '@/components/ui/form-field-styles'

interface Role {
  id: number
  name: string
  level: number
  description: string | null
}

interface Client {
  id: string
  name: string
  rut: string | null
}

type ModalTabId = 'manual' | 'orphan_emails'

interface CreateUserModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CreateUserModal({ isOpen, onClose, onSuccess }: CreateUserModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [roles, setRoles] = useState<Role[]>([])
  const [clients, setClients] = useState<Client[]>([])
  const [isLoadingRoles, setIsLoadingRoles] = useState(false)
  const [isLoadingClients, setIsLoadingClients] = useState(false)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<ModalTabId>('manual')
  const [potentialClientEmails, setPotentialClientEmails] = useState<string[]>([])
  const [isLoadingPotentialEmails, setIsLoadingPotentialEmails] = useState(false)
  const [potentialEmailsFetchError, setPotentialEmailsFetchError] = useState<string | null>(null)
  const [isCreatingPotentialUsers, setIsCreatingPotentialUsers] = useState(false)
  const [potentialCreationError, setPotentialCreationError] = useState<string | null>(null)
  type PotentialCreationResult = {
    email: string
    status: 'created' | 'skipped' | 'error'
    reason?: string
    errorCode?: string
    webhookSent?: boolean
    webhookError?: string
  }
  const [potentialCreationSummary, setPotentialCreationSummary] = useState<{
    created: number
    skipped: number
    errors: number
    results: PotentialCreationResult[]
  } | null>(null)
  const isDevEnvironment = process.env.NODE_ENV === 'development'
  const [devCreationLimit, setDevCreationLimit] = useState<string>('')

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role_id: '' as string | number,
    client_id: '' as string | null,
  })

  const fetchRoles = useCallback(async () => {
    setIsLoadingRoles(true)
    try {
      const response = await fetch('/api/settings/roles')
      if (!response.ok) throw new Error('Error al cargar roles')
      const data = await response.json()
      setRoles(data.roles || [])
    } catch (err) {
      console.error('Error fetching roles:', err)
      setError('Error al cargar roles')
    } finally {
      setIsLoadingRoles(false)
    }
  }, [])

  const fetchClients = useCallback(async () => {
    setIsLoadingClients(true)
    try {
      const supabase = getSupabaseClient()

      if (!user?.company_id) {
        throw new Error('No se pudo obtener la compañía del usuario')
      }

      const { data, error } = await supabase
        .from('clients')
        .select('id, name, rut')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (err) {
      console.error('Error fetching clients:', err)
      setError('Error al cargar clientes')
    } finally {
      setIsLoadingClients(false)
    }
  }, [user?.company_id])

  const fetchCompanyName = useCallback(async () => {
    if (!user?.company_id) {
      setCompanyName(null)
      return
    }

    try {
      const supabase = getSupabaseClient()
      const { data, error } = await supabase
        .from('companies')
        .select('name')
        .eq('id', user.company_id)
        .single()

      if (error) throw error
      setCompanyName(data?.name ?? null)
    } catch (err) {
      console.error('Error fetching company name:', err)
      setCompanyName(null)
    }
  }, [user?.company_id])

  const fetchPotentialClientEmails = useCallback(async () => {
    setIsLoadingPotentialEmails(true)
    setPotentialEmailsFetchError(null)
    try {
      const response = await fetch('/api/settings/orphan-client-emails')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar correos pendientes')
      }
      const emails = data.potentialEmails as string[] | undefined
      setPotentialClientEmails(Array.isArray(emails) ? emails : [])
    } catch (err) {
      console.error('Error fetching potential client emails:', err)
      setPotentialEmailsFetchError(err instanceof Error ? err.message : 'Error al cargar la lista')
      setPotentialClientEmails([])
    } finally {
      setIsLoadingPotentialEmails(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchRoles()
      fetchCompanyName()
    }
  }, [isOpen, fetchRoles, fetchCompanyName])

  useEffect(() => {
    if (isOpen && activeTab === 'orphan_emails') {
      fetchPotentialClientEmails()
    }
  }, [isOpen, activeTab, fetchPotentialClientEmails])

  useEffect(() => {
    if (isOpen && formData.role_id && roles.length > 0) {
      const roleIdNumber = Number(formData.role_id)
      const selectedRole = roles.find((r) => r.id === roleIdNumber)

      if (selectedRole?.name === 'consumidor') {
        fetchClients()
      } else {
        setFormData((prev) => ({ ...prev, client_id: null }))
      }

      if (
        selectedRole?.name === 'validador' ||
        selectedRole?.name === 'comun' ||
        selectedRole?.name === 'admin'
      ) {
        setFormData((prev) => ({ ...prev, password: '' }))
      }
    }
  }, [formData.role_id, isOpen, roles, fetchClients])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const response = await fetch('/api/settings/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          password: formData.password,
          role_id: formData.role_id ? Number(formData.role_id) : null,
          client_id: formData.client_id || null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        let errorMessage = data.error || 'Error al crear usuario'
        if (data.details) {
          errorMessage += `: ${data.details}`
        }
        setError(errorMessage)
        return
      }

      setSuccess(true)
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: '',
        client_id: null,
      })

      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      console.error('Error al crear usuario:', err)
      setError('Error inesperado al crear usuario')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDismissPotentialCreationSummary = () => {
    setPotentialCreationSummary(null)
  }

  const handleClose = () => {
    if (!isSubmitting && !isCreatingPotentialUsers) {
      setFormData({
        name: '',
        email: '',
        password: '',
        role_id: '',
        client_id: null,
      })
      setError(null)
      setSuccess(false)
      setActiveTab('manual')
      setPotentialClientEmails([])
      setPotentialEmailsFetchError(null)
      setPotentialCreationError(null)
      setPotentialCreationSummary(null)
      onClose()
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) handleClose()
  }

  const handleCreateUsersFromPotentialEmails = async () => {
    if (potentialClientEmails.length === 0) return
    setIsCreatingPotentialUsers(true)
    setPotentialCreationError(null)
    setPotentialCreationSummary(null)
    try {
      let emailsToSend = potentialClientEmails
      if (isDevEnvironment && devCreationLimit.trim() !== '') {
        const parsedLimit = Number.parseInt(devCreationLimit, 10)
        if (Number.isFinite(parsedLimit) && parsedLimit > 0) {
          emailsToSend = potentialClientEmails.slice(0, parsedLimit)
        }
      }
      const response = await fetch('/api/settings/orphan-client-emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ emails: emailsToSend }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al crear usuarios')
      }
      const summary = {
        created: data.summary?.created ?? 0,
        skipped: data.summary?.skipped ?? 0,
        errors: data.summary?.errors ?? 0,
        results: Array.isArray(data.results) ? (data.results as PotentialCreationResult[]) : [],
      }
      setPotentialCreationSummary(summary)
      await fetchPotentialClientEmails()
      if (summary.created > 0) {
        onSuccess()
      }
    } catch (err) {
      console.error('Error creando usuarios desde correos huérfanos:', err)
      setPotentialCreationError(err instanceof Error ? err.message : 'Error inesperado')
    } finally {
      setIsCreatingPotentialUsers(false)
    }
  }

  const roleIdNumber = formData.role_id ? Number(formData.role_id) : null
  const selectedRole = roleIdNumber ? roles.find((r) => r.id === roleIdNumber) : null
  const showClientSelector = selectedRole?.name === 'consumidor'
  const usesDefaultPassword =
    selectedRole?.name === 'validador' ||
    selectedRole?.name === 'comun' ||
    selectedRole?.name === 'admin'

  const busy = isSubmitting || isCreatingPotentialUsers

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <UserPlus className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Crear usuario</DialogTitle>
              <DialogDescription className="mt-1">
                Crea un nuevo usuario en el sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-6 py-5">
          <Tabs
            value={activeTab}
            onValueChange={(value) => setActiveTab(value as ModalTabId)}
            className="gap-4"
          >
            <TabsList className="grid w-full grid-cols-2">
              <TabsTrigger value="manual" disabled={busy} className="gap-1.5">
                <UserPlus className="h-4 w-4 text-green-700" />
                Manual
              </TabsTrigger>
              <TabsTrigger value="orphan_emails" disabled={busy} className="gap-1.5">
                <Sparkles className="h-4 w-4 text-green-700" />
                Pendientes
              </TabsTrigger>
            </TabsList>

            <TabsContent value="manual">
              <form id="create-user-manual-form" onSubmit={handleSubmit} className="space-y-4">
                {error ? (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                    <p className="font-medium">Error al crear usuario</p>
                    <p className="mt-1">{error}</p>
                  </div>
                ) : null}

                {success ? (
                  <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                    ¡Usuario creado exitosamente!
                  </div>
                ) : null}

                <FormSection
                  step={1}
                  title="Cuenta"
                  description="Nombre, correo y contraseña de acceso"
                >
                  <div className="space-y-4">
                    <Field label="Nombre completo" required>
                      <Input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className={fieldClassName}
                        placeholder="Juan Pérez"
                        disabled={isSubmitting}
                      />
                    </Field>

                    <Field label="Correo electrónico" required>
                      <div className="relative">
                        <Mail className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type="email"
                          required
                          value={formData.email}
                          onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                          className={`${fieldClassName} pl-10`}
                          placeholder="usuario@ejemplo.com"
                          disabled={isSubmitting}
                        />
                      </div>
                    </Field>

                    <Field
                      label={
                        usesDefaultPassword
                          ? 'Contraseña (se usará por defecto)'
                          : 'Contraseña'
                      }
                      required={!usesDefaultPassword}
                    >
                      <div className="relative">
                        <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                        <Input
                          type={showPassword ? 'text' : 'password'}
                          required={!usesDefaultPassword}
                          minLength={6}
                          value={formData.password}
                          onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                          className={`${fieldClassName} pl-10 pr-10`}
                          placeholder="••••••••"
                          disabled={isSubmitting || usesDefaultPassword}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                          disabled={isSubmitting}
                        >
                          {showPassword ? (
                            <EyeOff className="h-4 w-4" />
                          ) : (
                            <Eye className="h-4 w-4" />
                          )}
                        </button>
                      </div>
                      <p className="mt-1 text-xs text-muted-foreground">
                        {usesDefaultPassword
                          ? companyName
                            ? `Para roles de validador, común o admin se usará la contraseña por defecto: ${companyName}!#2026#!`
                            : 'Para roles de validador, común o admin se usará la contraseña por defecto basada en el nombre de la compañía'
                          : 'La contraseña debe tener al menos 6 caracteres'}
                      </p>
                    </Field>
                  </div>
                </FormSection>

                <FormSection
                  step={2}
                  title="Rol"
                  description="Permisos y tipo de acceso del usuario"
                >
                  {isLoadingRoles ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                      <span className="ml-2 text-sm text-muted-foreground">Cargando roles...</span>
                    </div>
                  ) : (
                    <Field label="Rol" required>
                      <select
                        required
                        value={formData.role_id}
                        onChange={(e) =>
                          setFormData({ ...formData, role_id: e.target.value, client_id: null })
                        }
                        className={fieldClassName}
                        disabled={isSubmitting}
                      >
                        <option value="">Seleccione un rol</option>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name} {role.description && `- ${role.description}`}
                          </option>
                        ))}
                      </select>
                    </Field>
                  )}
                </FormSection>

                {showClientSelector ? (
                  <FormSection
                    step={3}
                    title="Cliente"
                    description="Los consumidores deben estar asociados a un cliente"
                  >
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        <span className="ml-2 text-sm text-muted-foreground">
                          Cargando clientes...
                        </span>
                      </div>
                    ) : (
                      <Field label="Cliente" required>
                        <select
                          required
                          value={formData.client_id || ''}
                          onChange={(e) =>
                            setFormData({ ...formData, client_id: e.target.value || null })
                          }
                          className={fieldClassName}
                          disabled={isSubmitting}
                        >
                          <option value="">Seleccione un cliente</option>
                          {clients.map((client) => (
                            <option key={client.id} value={client.id}>
                              {client.name} {client.rut && `(${client.rut})`}
                            </option>
                          ))}
                        </select>
                      </Field>
                    )}
                  </FormSection>
                ) : null}
              </form>
            </TabsContent>

            <TabsContent value="orphan_emails">
              {potentialCreationSummary ? (
                <div className="flex min-h-[280px] flex-col">
                  <h4 className="mb-3 text-sm font-semibold text-foreground">
                    Resultado del procesamiento
                  </h4>
                  {(() => {
                    const summary = potentialCreationSummary
                    const createdResults = summary.results.filter((r) => r.status === 'created')
                    const webhookSentCount = createdResults.filter(
                      (r) => r.webhookSent === true
                    ).length
                    const webhookFailedResults = createdResults.filter(
                      (r) => r.webhookSent === false
                    )
                    return (
                      <>
                        <div className="mb-3 grid grid-cols-3 gap-2">
                          <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-3 text-center">
                            <div className="text-2xl font-bold tabular-nums text-green-800">
                              {summary.created}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-green-700">Creados</div>
                          </div>
                          <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-3 text-center">
                            <div className="text-2xl font-bold tabular-nums text-amber-800">
                              {summary.skipped}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-amber-700">
                              Saltados
                            </div>
                          </div>
                          <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-3 text-center">
                            <div className="text-2xl font-bold tabular-nums text-red-800">
                              {summary.errors}
                            </div>
                            <div className="mt-0.5 text-xs font-medium text-red-700">Errores</div>
                          </div>
                        </div>
                        {createdResults.length > 0 ? (
                          <p className="mb-2 text-xs text-muted-foreground">
                            Webhook n8n: {webhookSentCount} de {createdResults.length} enviados
                            {webhookFailedResults.length > 0 &&
                              ` · ${webhookFailedResults.length} fallaron`}
                          </p>
                        ) : null}
                        <p className="mb-1.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                          Detalle por correo
                        </p>
                        <ul className="max-h-64 flex-1 divide-y divide-gray-200 overflow-y-auto rounded-md border border-gray-200 bg-gray-50/80">
                          {summary.results.map((result, resultIndex) => {
                            const isWebhookFailure =
                              result.status === 'created' && result.webhookSent === false
                            return (
                              <li
                                key={`detail-${resultIndex}-${result.email}`}
                                className="px-3 py-2.5 text-sm"
                              >
                                <div className="flex items-start gap-2">
                                  {result.status === 'created' ? (
                                    <CheckCircle2
                                      className="mt-0.5 h-4 w-4 shrink-0 text-green-600"
                                      aria-hidden
                                    />
                                  ) : null}
                                  {result.status === 'skipped' ? (
                                    <SkipForward
                                      className="mt-0.5 h-4 w-4 shrink-0 text-amber-600"
                                      aria-hidden
                                    />
                                  ) : null}
                                  {result.status === 'error' ? (
                                    <AlertCircle
                                      className="mt-0.5 h-4 w-4 shrink-0 text-red-600"
                                      aria-hidden
                                    />
                                  ) : null}
                                  <div className="min-w-0 flex-1">
                                    <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                      <span
                                        className={`inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                                          result.status === 'created'
                                            ? 'bg-green-100 text-green-800'
                                            : result.status === 'skipped'
                                              ? 'bg-amber-100 text-amber-800'
                                              : 'bg-red-100 text-red-800'
                                        }`}
                                      >
                                        {result.status === 'created'
                                          ? 'Creado'
                                          : result.status === 'skipped'
                                            ? 'Saltado'
                                            : 'Error'}
                                      </span>
                                      <span
                                        className="truncate font-mono text-foreground"
                                        title={result.email}
                                      >
                                        {result.email}
                                      </span>
                                    </div>
                                    {result.reason ? (
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        {result.reason}
                                      </p>
                                    ) : null}
                                    {result.errorCode ? (
                                      <p className="mt-0.5 text-xs text-muted-foreground">
                                        Código: {result.errorCode}
                                      </p>
                                    ) : null}
                                    {result.status === 'created' && result.webhookSent === true ? (
                                      <p className="mt-0.5 text-xs text-green-700">
                                        Webhook enviado
                                      </p>
                                    ) : null}
                                    {isWebhookFailure ? (
                                      <p className="mt-0.5 text-xs text-orange-800">
                                        Webhook: {result.webhookError || 'no enviado'}
                                      </p>
                                    ) : null}
                                  </div>
                                </div>
                              </li>
                            )
                          })}
                        </ul>
                      </>
                    )
                  })()}
                </div>
              ) : (
                <div className="flex min-h-[220px] flex-col">
                  <p className="mb-3 text-sm text-muted-foreground">
                    Lista única de correos de contacto de clientes de tu compañía que aún no
                    coinciden con ningún usuario registrado (candidatos a crear cuenta).
                  </p>
                  {potentialEmailsFetchError ? (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {potentialEmailsFetchError}
                    </div>
                  ) : null}
                  {potentialCreationError ? (
                    <div className="mb-3 rounded-md border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                      {potentialCreationError}
                    </div>
                  ) : null}
                  {isDevEnvironment ? (
                    <div className="mb-3 rounded-md border border-dashed border-amber-300 bg-amber-50 p-2.5">
                      <label
                        htmlFor="dev_creation_limit"
                        className="block text-xs font-semibold uppercase tracking-wide text-amber-900"
                      >
                        Límite de prueba (sólo dev)
                      </label>
                      <div className="mt-1 flex items-center gap-2">
                        <Input
                          type="number"
                          id="dev_creation_limit"
                          min={1}
                          step={1}
                          value={devCreationLimit}
                          onChange={(e) => setDevCreationLimit(e.target.value)}
                          placeholder="Ej: 1"
                          disabled={isCreatingPotentialUsers}
                          className="h-8 w-24"
                        />
                        <span className="text-xs text-amber-800">
                          Si está vacío se procesan todos los {potentialClientEmails.length}{' '}
                          correos.
                        </span>
                      </div>
                    </div>
                  ) : null}
                  <div className="max-h-56 flex-1 overflow-y-auto rounded-md border border-gray-200 bg-gray-50/80">
                    {isLoadingPotentialEmails ? (
                      <div className="flex items-center justify-center gap-2 py-10 text-sm text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin" />
                        Cargando…
                      </div>
                    ) : potentialClientEmails.length === 0 ? (
                      <p className="px-4 py-10 text-center text-sm text-muted-foreground">
                        No hay correos pendientes: todos los correos de contacto de clientes ya
                        existen como usuarios en el sistema.
                      </p>
                    ) : (
                      <ul className="divide-y divide-gray-200">
                        {potentialClientEmails.map((emailAddress) => (
                          <li
                            key={emailAddress}
                            className="truncate px-3 py-2.5 font-mono text-sm text-foreground"
                            title={emailAddress}
                          >
                            {emailAddress}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  <Button
                    type="button"
                    onClick={handleCreateUsersFromPotentialEmails}
                    disabled={
                      isLoadingPotentialEmails ||
                      isCreatingPotentialUsers ||
                      potentialClientEmails.length === 0
                    }
                    className="mt-4 w-full gap-2"
                  >
                    {isCreatingPotentialUsers ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Creando usuarios…
                      </>
                    ) : (
                      <>
                        <Sparkles className="h-4 w-4" />
                        Crear usuarios
                      </>
                    )}
                  </Button>
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        <DialogFooter>
          {activeTab === 'manual' ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                form="create-user-manual-form"
                disabled={isSubmitting || success}
                className="gap-2"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Creando...
                  </>
                ) : (
                  'Crear usuario'
                )}
              </Button>
            </>
          ) : potentialCreationSummary ? (
            <>
              <Button
                type="button"
                variant="outline"
                onClick={handleClose}
                disabled={busy}
              >
                Cancelar
              </Button>
              <Button type="button" onClick={handleDismissPotentialCreationSummary}>
                Cerrar resultado
              </Button>
            </>
          ) : (
            <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
              Cancelar
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
