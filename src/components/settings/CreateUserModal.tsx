'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, UserPlus, Loader2, Mail, Lock, Eye, EyeOff, Shield, Building2, Sparkles, CheckCircle2, SkipForward, AlertCircle } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'

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
    client_id: '' as string | null
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

  // Cargar roles y nombre de compañía al abrir el modal
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

  // Cargar clientes cuando se selecciona rol "consumidor" y limpiar contraseña si usa default
  useEffect(() => {
    if (isOpen && formData.role_id && roles.length > 0) {
      const roleIdNumber = Number(formData.role_id)
      const selectedRole = roles.find(r => r.id === roleIdNumber)
      
      if (selectedRole?.name === 'consumidor') {
        fetchClients()
      } else {
        setFormData(prev => ({ ...prev, client_id: null }))
      }
      
      // Si el rol usa contraseña por defecto, limpiar el campo de contraseña
      if (selectedRole?.name === 'validador' || 
          selectedRole?.name === 'comun' || 
          selectedRole?.name === 'admin') {
        setFormData(prev => ({ ...prev, password: '' }))
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
          client_id: formData.client_id || null
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        // Mostrar error principal y detalles si existen
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
        client_id: null
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
        client_id: null
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
  const selectedRole = roleIdNumber ? roles.find(r => r.id === roleIdNumber) : null
  const showClientSelector = selectedRole?.name === 'consumidor'
  const usesDefaultPassword = selectedRole?.name === 'validador' || 
                              selectedRole?.name === 'comun' || 
                              selectedRole?.name === 'admin'

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <UserPlus className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Crear Usuario
                  </h3>
                  <p className="text-sm text-gray-500">
                    Crea un nuevo usuario en el sistema
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isSubmitting || isCreatingPotentialUsers}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="flex rounded-lg border border-gray-200 p-0.5 bg-gray-50 mb-4" role="tablist">
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'manual'}
                onClick={() => setActiveTab('manual')}
                disabled={isSubmitting || isCreatingPotentialUsers}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'manual'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } disabled:opacity-50`}
              >
                <UserPlus className="h-4 w-4 shrink-0 text-green-600" />
                Manual
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={activeTab === 'orphan_emails'}
                onClick={() => setActiveTab('orphan_emails')}
                disabled={isSubmitting || isCreatingPotentialUsers}
                className={`flex-1 inline-flex items-center justify-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
                  activeTab === 'orphan_emails'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                } disabled:opacity-50`}
              >
                <Sparkles className="h-4 w-4 shrink-0 text-violet-600" />
                Pendientes
              </button>
            </div>

            {activeTab === 'manual' ? (
          <form id="create-user-manual-form" onSubmit={handleSubmit}>
              {error && (
                <div className="mb-4 p-4 bg-red-50 border-l-4 border-red-400 rounded-md">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">
                        Error al crear usuario
                      </h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {success && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md text-green-800 text-sm">
                  ¡Usuario creado exitosamente!
                </div>
              )}

              <div className="space-y-4">
                {/* Rol */}
                <div>
                  <label htmlFor="role_id" className="block text-sm font-medium text-gray-700 mb-1">
                    <Shield className="inline h-4 w-4 mr-1" />
                    Rol
                  </label>
                  {isLoadingRoles ? (
                    <div className="flex items-center justify-center py-2">
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                      <span className="ml-2 text-sm text-gray-500">Cargando roles...</span>
                    </div>
                  ) : (
                    <select
                      id="role_id"
                      required
                      value={formData.role_id}
                      onChange={(e) => setFormData({ ...formData, role_id: e.target.value, client_id: null })}
                      className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      disabled={isSubmitting}
                    >
                      <option value="">Seleccione un rol</option>
                      {roles.map((role) => (
                        <option key={role.id} value={role.id}>
                          {role.name} {role.description && `- ${role.description}`}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
                {/* Nombre */}
                <div>
                  <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre completo
                  </label>
                  <input
                    type="text"
                    id="name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                    placeholder="Juan Pérez"
                    disabled={isSubmitting}
                  />
                </div>

                {/* Email */}
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                    Correo electrónico
                  </label>
                  <div className="relative">
                    <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type="email"
                      id="email"
                      required
                      value={formData.email}
                      onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                      className="block w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                      placeholder="usuario@ejemplo.com"
                      disabled={isSubmitting}
                    />
                  </div>
                </div>

                {/* Password */}
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                    Contraseña
                    {usesDefaultPassword && (
                      <span className="text-xs font-normal text-gray-500 ml-2">(se usará contraseña por defecto)</span>
                    )}
                  </label>
                  <div className="relative">
                    <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      id="password"
                      required={!usesDefaultPassword}
                      minLength={6}
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      className="block w-full pl-10 pr-12 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500 disabled:bg-gray-100"
                      placeholder="••••••••"
                      disabled={isSubmitting || usesDefaultPassword}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                      disabled={isSubmitting}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {usesDefaultPassword 
                      ? companyName
                        ? `Para roles de validador, común o admin se usará la contraseña por defecto: ${companyName}!#2026#!`
                        : 'Para roles de validador, común o admin se usará la contraseña por defecto basada en el nombre de la compañía'
                      : 'La contraseña debe tener al menos 6 caracteres'
                    }
                  </p>
                </div>

                

                {/* Cliente (solo si rol es consumidor) */}
                {showClientSelector && (
                  <div>
                    <label htmlFor="client_id" className="block text-sm font-medium text-gray-700 mb-1">
                      <Building2 className="inline h-4 w-4 mr-1" />
                      Cliente
                    </label>
                    {isLoadingClients ? (
                      <div className="flex items-center justify-center py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                        <span className="ml-2 text-sm text-gray-500">Cargando clientes...</span>
                      </div>
                    ) : (
                      <select
                        id="client_id"
                        required
                        value={formData.client_id || ''}
                        onChange={(e) => setFormData({ ...formData, client_id: e.target.value || null })}
                        className="block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"
                        disabled={isSubmitting}
                      >
                        <option value="">Seleccione un cliente</option>
                        {clients.map((client) => (
                          <option key={client.id} value={client.id}>
                            {client.name} {client.rut && `(${client.rut})`}
                          </option>
                        ))}
                      </select>
                    )}
                    <p className="mt-1 text-xs text-gray-500">
                      Los usuarios con rol &quot;consumidor&quot; deben estar asociados a un cliente
                    </p>
                  </div>
                )}
              </div>
          </form>
            ) : potentialCreationSummary ? (
              <div className="flex flex-col min-h-[280px]">
                <h4 className="text-sm font-semibold text-gray-900 mb-3">
                  Resultado del procesamiento
                </h4>
                {(() => {
                  const summary = potentialCreationSummary
                  const createdResults = summary.results.filter((r) => r.status === 'created')
                  const webhookSentCount = createdResults.filter((r) => r.webhookSent === true).length
                  const webhookFailedResults = createdResults.filter((r) => r.webhookSent === false)
                  return (
                    <>
                      <div className="grid grid-cols-3 gap-2 mb-3">
                        <div className="rounded-lg border border-green-200 bg-green-50 px-2 py-3 text-center">
                          <div className="text-2xl font-bold tabular-nums text-green-800">{summary.created}</div>
                          <div className="text-xs font-medium text-green-700 mt-0.5">Creados</div>
                        </div>
                        <div className="rounded-lg border border-amber-200 bg-amber-50 px-2 py-3 text-center">
                          <div className="text-2xl font-bold tabular-nums text-amber-800">{summary.skipped}</div>
                          <div className="text-xs font-medium text-amber-700 mt-0.5">Saltados</div>
                        </div>
                        <div className="rounded-lg border border-red-200 bg-red-50 px-2 py-3 text-center">
                          <div className="text-2xl font-bold tabular-nums text-red-800">{summary.errors}</div>
                          <div className="text-xs font-medium text-red-700 mt-0.5">Errores</div>
                        </div>
                      </div>
                      {createdResults.length > 0 && (
                        <p className="text-xs text-gray-600 mb-2">
                          Webhook n8n: {webhookSentCount} de {createdResults.length} enviados
                          {webhookFailedResults.length > 0 && ` · ${webhookFailedResults.length} fallaron`}
                        </p>
                      )}
                      <p className="text-xs font-medium text-gray-500 uppercase tracking-wide mb-1.5">
                        Detalle por correo
                      </p>
                      <ul className="flex-1 rounded-md border border-gray-200 bg-gray-50/80 max-h-64 overflow-y-auto divide-y divide-gray-200">
                        {summary.results.map((result, resultIndex) => {
                          const isWebhookFailure =
                            result.status === 'created' && result.webhookSent === false
                          return (
                            <li key={`detail-${resultIndex}-${result.email}`} className="px-3 py-2.5 text-sm">
                              <div className="flex items-start gap-2">
                                {result.status === 'created' && (
                                  <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600 mt-0.5" aria-hidden />
                                )}
                                {result.status === 'skipped' && (
                                  <SkipForward className="h-4 w-4 shrink-0 text-amber-600 mt-0.5" aria-hidden />
                                )}
                                {result.status === 'error' && (
                                  <AlertCircle className="h-4 w-4 shrink-0 text-red-600 mt-0.5" aria-hidden />
                                )}
                                <div className="min-w-0 flex-1">
                                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                                    <span
                                      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] uppercase tracking-wide font-semibold ${
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
                                    <span className="font-mono text-gray-900 truncate" title={result.email}>
                                      {result.email}
                                    </span>
                                  </div>
                                  {result.reason && (
                                    <p className="mt-0.5 text-xs text-gray-600">{result.reason}</p>
                                  )}
                                  {result.errorCode && (
                                    <p className="mt-0.5 text-xs text-gray-500">Código: {result.errorCode}</p>
                                  )}
                                  {result.status === 'created' && result.webhookSent === true && (
                                    <p className="mt-0.5 text-xs text-green-700">Webhook enviado</p>
                                  )}
                                  {isWebhookFailure && (
                                    <p className="mt-0.5 text-xs text-orange-800">
                                      Webhook: {result.webhookError || 'no enviado'}
                                    </p>
                                  )}
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
              <div className="flex flex-col min-h-[220px]">
                <p className="text-sm text-gray-600 mb-3">
                  Lista única de correos de contacto de clientes de tu compañía que aún no coinciden con ningún usuario registrado (candidatos a crear cuenta).
                </p>
                {potentialEmailsFetchError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    {potentialEmailsFetchError}
                  </div>
                )}
                {potentialCreationError && (
                  <div className="mb-3 p-3 bg-red-50 border border-red-200 rounded-md text-sm text-red-800">
                    {potentialCreationError}
                  </div>
                )}
                {isDevEnvironment && (
                  <div className="mb-3 p-2.5 rounded-md border border-dashed border-amber-300 bg-amber-50">
                    <label htmlFor="dev_creation_limit" className="block text-xs font-semibold text-amber-900 uppercase tracking-wide">
                      Límite de prueba (sólo dev)
                    </label>
                    <div className="mt-1 flex items-center gap-2">
                      <input
                        type="number"
                        id="dev_creation_limit"
                        min={1}
                        step={1}
                        value={devCreationLimit}
                        onChange={(e) => setDevCreationLimit(e.target.value)}
                        placeholder="Ej: 1"
                        disabled={isCreatingPotentialUsers}
                        className="block w-24 px-2 py-1 text-sm border border-amber-300 rounded-md bg-white focus:outline-none focus:ring-1 focus:ring-amber-500 disabled:opacity-50"
                      />
                      <span className="text-xs text-amber-800">
                        Si está vacío se procesan todos los {potentialClientEmails.length} correos.
                      </span>
                    </div>
                  </div>
                )}
                <div className="flex-1 rounded-md border border-gray-200 bg-gray-50/80 max-h-56 overflow-y-auto">
                  {isLoadingPotentialEmails ? (
                    <div className="flex items-center justify-center py-10 gap-2 text-gray-500 text-sm">
                      <Loader2 className="h-5 w-5 animate-spin" />
                      Cargando…
                    </div>
                  ) : potentialClientEmails.length === 0 ? (
                    <p className="py-10 px-4 text-center text-sm text-gray-500">
                      No hay correos pendientes: todos los correos de contacto de clientes ya existen como usuarios en el sistema.
                    </p>
                  ) : (
                    <ul className="divide-y divide-gray-200">
                      {potentialClientEmails.map((emailAddress) => (
                        <li
                          key={emailAddress}
                          className="px-3 py-2.5 text-sm text-gray-900 font-mono truncate"
                          title={emailAddress}
                        >
                          {emailAddress}
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
                <button
                  type="button"
                  onClick={handleCreateUsersFromPotentialEmails}
                  disabled={isLoadingPotentialEmails || isCreatingPotentialUsers || potentialClientEmails.length === 0}
                  className="mt-4 w-full inline-flex justify-center items-center gap-2 rounded-md border border-transparent shadow-sm px-4 py-2.5 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
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
                </button>
              </div>
            )}
          </div>

            <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
              {activeTab === 'manual' ? (
                <>
                  <button
                    type="submit"
                    form="create-user-manual-form"
                    disabled={isSubmitting || success}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSubmitting ? (
                      <>
                        <Loader2 className="h-5 w-5 animate-spin mr-2" />
                        Creando...
                      </>
                    ) : (
                      'Crear Usuario'
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </>
              ) : potentialCreationSummary ? (
                <>
                  <button
                    type="button"
                    onClick={handleDismissPotentialCreationSummary}
                    className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-violet-600 text-base font-medium text-white hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-violet-500 sm:ml-3 sm:w-auto sm:text-sm"
                  >
                    Cerrar resultado
                  </button>
                  <button
                    type="button"
                    onClick={handleClose}
                    disabled={isSubmitting || isCreatingPotentialUsers}
                    className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Cancelar
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={handleClose}
                  disabled={isSubmitting || isCreatingPotentialUsers}
                  className="w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:w-auto sm:text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Cancelar
                </button>
              )}
            </div>
        </div>
      </div>
    </div>
  )
}
