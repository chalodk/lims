export const COMPANY_NAME_MAX_LENGTH = 120

export type CreatedCompany = {
  id: string
  name: string
  plan_tier: string
  trial_ends_at: string
}

export type CreateCompanyRpcError = {
  code?: string
  message?: string
}

export type CreateCompanyRpc = (companyName: string) => Promise<{
  data: unknown
  error: CreateCompanyRpcError | null
}>

export type CreateCompanyResult =
  | { status: 201; body: { company: CreatedCompany } }
  | { status: 400 | 403 | 409 | 500; body: { error: string }; logMessage?: string }

const CONTROL_CHARACTERS = /[\u0000-\u001F\u007F]/

export function parseCompanyName(
  value: unknown
): { ok: true; name: string } | { ok: false; error: string } {
  if (typeof value !== 'string') {
    return { ok: false, error: 'El nombre es requerido' }
  }

  const name = value.trim()
  if (!name) {
    return { ok: false, error: 'El nombre es requerido' }
  }
  if (name.length > COMPANY_NAME_MAX_LENGTH) {
    return { ok: false, error: `El nombre no puede superar ${COMPANY_NAME_MAX_LENGTH} caracteres` }
  }
  if (CONTROL_CHARACTERS.test(name)) {
    return { ok: false, error: 'El nombre no es válido' }
  }

  return { ok: true, name }
}

function readName(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  return (body as { name?: unknown }).name
}

export function mapCreateCompanyRpcError(error: CreateCompanyRpcError): {
  status: 400 | 403 | 409 | 500
  error: string
  logMessage?: string
} {
  const message = error.message || ''

  if (error.code === '23505' || message === 'company name already exists') {
    return { status: 409, error: 'Ya existe una compañía con ese nombre' }
  }
  if (error.code === '42501' || message === 'not authorized') {
    return { status: 403, error: 'Acceso denegado' }
  }
  if (error.code === '22023' || message === 'nombre inválido') {
    return { status: 400, error: 'El nombre no es válido' }
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return {
      status: 500,
      error: 'Error al crear la compañía',
      logMessage: 'Falta aplicar migrations/032_csx_create_company.sql (función create_company).',
    }
  }

  return {
    status: 500,
    error: 'Error al crear la compañía',
    logMessage: message || 'Error desconocido al crear la compañía',
  }
}

function readCreatedCompany(data: unknown): CreatedCompany | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  if (typeof row.id !== 'string' || !row.id) return null
  if (typeof row.name !== 'string' || !row.name) return null
  if (typeof row.plan_tier !== 'string' || !row.plan_tier) return null
  if (typeof row.trial_ends_at !== 'string' || !row.trial_ends_at) return null

  return {
    id: row.id,
    name: row.name,
    plan_tier: row.plan_tier,
    trial_ends_at: row.trial_ends_at,
  }
}

/**
 * Crea una company a partir del body del cliente.
 * Solo usa `name`. plan, trial, flags y el actor los fija create_company().
 */
export async function executeCreateCompany(
  body: unknown,
  createCompany: CreateCompanyRpc
): Promise<CreateCompanyResult> {
  const parsedName = parseCompanyName(readName(body))
  if (!parsedName.ok) {
    return { status: 400, body: { error: parsedName.error } }
  }

  const { data, error } = await createCompany(parsedName.name)
  if (error) {
    const mapped = mapCreateCompanyRpcError(error)
    return {
      status: mapped.status,
      body: { error: mapped.error },
      logMessage: mapped.logMessage,
    }
  }

  const company = readCreatedCompany(data)
  if (!company) {
    return {
      status: 500,
      body: { error: 'Error al crear la compañía' },
      logMessage: 'Respuesta vacía o incompleta de create_company',
    }
  }

  return { status: 201, body: { company } }
}
