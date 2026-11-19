import { validateEmail } from '@/lib/validation/validateEmail'

export const ADMIN_NAME_MAX_LENGTH = 120
export const ADMIN_SET_PASSWORD_PATH = '/auth/establecer-contrasena'
export const SAAS_APP_ORIGIN = 'https://lims.agroanalytics.cl'

export function adminSetPasswordRedirect(origin: string): string {
  return new URL(ADMIN_SET_PASSWORD_PATH, origin).toString()
}

/** Localhost conserva el origen del request. Cualquier otro host apunta al SaaS. */
export function adminSetPasswordUrl(requestOrigin: string): string {
  let origin = SAAS_APP_ORIGIN
  try {
    const url = new URL(requestOrigin)
    const isLocal = url.hostname === 'localhost' || url.hostname === '127.0.0.1'
    origin = isLocal ? url.origin : SAAS_APP_ORIGIN
  } catch {
    origin = SAAS_APP_ORIGIN
  }
  return adminSetPasswordRedirect(origin)
}

const COMPANY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

export type InvitedCompanyAdmin = {
  id: string
  name: string
  email: string
}

export type CompanyAdminEmail = {
  company_id: string
  email: string
}

type RpcError = {
  code?: string
  message?: string
}

export type InviteCompanyAdminDeps = {
  emailIsRegistered: (email: string) => Promise<{ registered: boolean; error: RpcError | null }>
  inviteAdmin: (input: {
    email: string
    userName: string
    companyName: string
    redirectTo: string
  }) => Promise<{ userId: string | null; error: RpcError | null }>
  createProfile: (input: {
    userId: string
    companyId: string
    name: string
    email: string
  }) => Promise<{ data: unknown; error: RpcError | null }>
  deleteAuthUser: (userId: string) => Promise<void>
}

export type InviteCompanyAdminResult =
  | { status: 201; body: { user: InvitedCompanyAdmin; invited: true } }
  | { status: 400 | 403 | 404 | 409 | 500; body: { error: string }; logMessage?: string }

export function mergeCompanyAdminEmails(
  companies: { id: string; name: string }[],
  adminRows: unknown
): { id: string; name: string; firstAdminEmail: string | null }[] {
  const emailsByCompany = new Map<string, string>()
  if (Array.isArray(adminRows)) {
    for (const row of adminRows) {
      if (!row || typeof row !== 'object') continue
      const record = row as { company_id?: unknown; email?: unknown }
      if (typeof record.company_id !== 'string' || typeof record.email !== 'string' || !record.email) {
        continue
      }
      emailsByCompany.set(record.company_id, record.email)
    }
  }

  return companies.map((company) => ({
    id: company.id,
    name: company.name,
    firstAdminEmail: emailsByCompany.get(company.id) ?? null,
  }))
}

function readInviteFields(body: unknown): { name: unknown; email: unknown } {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { name: undefined, email: undefined }
  }
  const record = body as { name?: unknown; email?: unknown }
  return { name: record.name, email: record.email }
}

function parseAdminName(value: unknown): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== 'string') {
    return { ok: false, error: 'El nombre es requerido' }
  }
  const name = value.trim()
  if (!name) {
    return { ok: false, error: 'El nombre es requerido' }
  }
  if (name.length > ADMIN_NAME_MAX_LENGTH) {
    return { ok: false, error: `El nombre no puede superar ${ADMIN_NAME_MAX_LENGTH} caracteres` }
  }
  if (CONTROL_CHARACTERS.test(name)) {
    return { ok: false, error: 'El nombre no es válido' }
  }
  return { ok: true, name }
}

function parseAdminEmail(value: unknown): { ok: true; email: string } | { ok: false; error: string } {
  if (typeof value !== 'string' || !value.trim()) {
    return { ok: false, error: 'El email es requerido' }
  }
  const email = value.trim().toLowerCase()
  if (!validateEmail(email)) {
    return { ok: false, error: 'El email no es válido' }
  }
  return { ok: true, email }
}

function isAlreadyRegisteredError(error: RpcError | null): boolean {
  if (!error) return false
  const message = (error.message || '').toLowerCase()
  return (
    error.code === 'email_exists' ||
    error.message === 'email already registered' ||
    message.includes('already been registered') ||
    message.includes('already registered')
  )
}

function mapInviteRpcError(error: RpcError): {
  status: 400 | 403 | 404 | 409 | 500
  error: string
  logMessage?: string
} {
  const message = error.message || ''

  if (message === 'company already has a user') {
    return { status: 409, error: 'Esta compañía ya tiene un usuario' }
  }
  if (isAlreadyRegisteredError(error)) {
    return { status: 409, error: 'El email ya está registrado' }
  }
  if (error.code === '23505') {
    return { status: 409, error: 'El email ya está registrado' }
  }
  if (error.code === '42501' || message === 'not authorized') {
    return { status: 403, error: 'Acceso denegado' }
  }
  if (error.code === 'P0002' || message === 'Compañía no encontrada') {
    return { status: 404, error: 'Compañía no encontrada' }
  }
  if (error.code === '22023' || message === 'nombre inválido' || message === 'email inválido') {
    return { status: 400, error: 'El nombre o el email no es válido' }
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return {
      status: 500,
      error: 'Error al invitar al administrador',
      logMessage: 'Falta aplicar migrations/033_csx_invite_company_admin.sql.',
    }
  }

  return {
    status: 500,
    error: 'Error al invitar al administrador',
    logMessage: message || 'Error desconocido al invitar al administrador',
  }
}

function readInvitedAdmin(data: unknown): InvitedCompanyAdmin | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return null
  if (typeof row.name !== 'string' || !row.name) return null
  if (typeof row.email !== 'string' || !row.email) return null
  return { id: row.id, name: row.name, email: row.email }
}

async function rollbackAuthUser(
  userId: string,
  deleteAuthUser: InviteCompanyAdminDeps['deleteAuthUser']
): Promise<string | undefined> {
  try {
    await deleteAuthUser(userId)
    return undefined
  } catch (error) {
    return error instanceof Error ? error.message : 'No se pudo deshacer la invitación'
  }
}

/**
 * Invita al primer admin de una company.
 * Solo usa name y email del body. El rol admin y el company_id los fija el servidor.
 */
export async function executeInviteCompanyAdmin(
  companyId: string,
  companyName: string,
  body: unknown,
  redirectTo: string,
  deps: InviteCompanyAdminDeps
): Promise<InviteCompanyAdminResult> {
  if (!COMPANY_ID_PATTERN.test(companyId)) {
    return { status: 400, body: { error: 'Compañía no válida' } }
  }
  if (!companyName.trim()) {
    return { status: 404, body: { error: 'Compañía no encontrada' } }
  }
  if (!redirectTo.endsWith(ADMIN_SET_PASSWORD_PATH)) {
    return {
      status: 500,
      body: { error: 'Error al invitar al administrador' },
      logMessage: 'redirectTo debe apuntar a la pantalla para elegir contraseña',
    }
  }

  const fields = readInviteFields(body)
  const parsedName = parseAdminName(fields.name)
  if (!parsedName.ok) {
    return { status: 400, body: { error: parsedName.error } }
  }
  const parsedEmail = parseAdminEmail(fields.email)
  if (!parsedEmail.ok) {
    return { status: 400, body: { error: parsedEmail.error } }
  }

  const registration = await deps.emailIsRegistered(parsedEmail.email)
  if (registration.error) {
    const mapped = mapInviteRpcError(registration.error)
    return { status: mapped.status, body: { error: mapped.error }, logMessage: mapped.logMessage }
  }
  if (registration.registered) {
    return { status: 409, body: { error: 'El email ya está registrado' } }
  }

  const invited = await deps.inviteAdmin({
    email: parsedEmail.email,
    userName: parsedName.name,
    companyName: companyName.trim(),
    redirectTo,
  })
  if (invited.error || !invited.userId) {
    const rollbackError =
      invited.userId && !isAlreadyRegisteredError(invited.error)
        ? await rollbackAuthUser(invited.userId, deps.deleteAuthUser)
        : undefined
    if (invited.error) {
      const mapped = mapInviteRpcError(invited.error)
      return {
        status: mapped.status,
        body: { error: mapped.error },
        logMessage: [mapped.logMessage, rollbackError].filter(Boolean).join(' ') || undefined,
      }
    }
    return {
      status: 500,
      body: { error: 'Error al invitar al administrador' },
      logMessage: 'Auth no devolvió el usuario invitado',
    }
  }

  const profile = await deps.createProfile({
    userId: invited.userId,
    companyId,
    name: parsedName.name,
    email: parsedEmail.email,
  })
  if (profile.error) {
    const rollbackError = await rollbackAuthUser(invited.userId, deps.deleteAuthUser)
    const mapped = mapInviteRpcError(profile.error)
    return {
      status: mapped.status,
      body: { error: mapped.error },
      logMessage: [mapped.logMessage, rollbackError].filter(Boolean).join(' '),
    }
  }

  const user = readInvitedAdmin(profile.data)
  if (!user) {
    const rollbackError = await rollbackAuthUser(invited.userId, deps.deleteAuthUser)
    return {
      status: 500,
      body: { error: 'Error al invitar al administrador' },
      logMessage: ['Respuesta vacía de create_company_first_admin', rollbackError].filter(Boolean).join(' '),
    }
  }

  return { status: 201, body: { user, invited: true } }
}
