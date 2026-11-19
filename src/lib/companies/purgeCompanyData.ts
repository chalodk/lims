export const SOIL_IMPORTS_BUCKET = 'soil-imports'

const COMPANY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type SoilOperationalCounts = {
  soilSamples: number
  soilResults: number
  soilReports: number
}

export type PurgeCompanyRpcError = {
  code?: string
  message?: string
}

export type CompanyOperationalCountsResult =
  | { status: 200; body: { counts: SoilOperationalCounts } }
  | { status: 403 | 404 | 500; body: { error: string }; logMessage?: string }

export type PurgeCompanyOperationalResult =
  | {
      status: 200
      body: {
        counts: SoilOperationalCounts
        storageWarning?: string
        failedStoragePaths?: string[]
      }
      logMessage?: string
    }
  | { status: 400 | 403 | 404 | 500; body: { error: string }; logMessage?: string }

type OperationalRpc = (companyId: string) => Promise<{
  data: unknown
  error: PurgeCompanyRpcError | null
}>

export interface CompanyOperationalCountsDependencies {
  loadCompany: (companyId: string) => Promise<{ name: string } | null>
  countOperationalData: OperationalRpc
}

export interface PurgeCompanyOperationalDependencies {
  loadCompany: (companyId: string) => Promise<{ name: string } | null>
  purgeOperationalData: OperationalRpc
  removeImportFiles: (storagePaths: string[]) => Promise<string[]>
}

const STORAGE_WARNING =
  'La base quedó limpia, pero no se pudieron borrar algunos archivos de importación.'

export function parseCompanyId(
  value: string
): { ok: true; companyId: string } | { ok: false; error: string } {
  const companyId = value.trim()
  if (!COMPANY_ID_PATTERN.test(companyId)) {
    return { ok: false, error: 'Compañía no encontrada' }
  }
  return { ok: true, companyId }
}

export function confirmCompanyName(
  confirmName: unknown,
  companyName: string
): { ok: true } | { ok: false; error: string } {
  if (typeof confirmName !== 'string' || confirmName.trim().length === 0) {
    return { ok: false, error: 'Escribe el nombre de la compañía para confirmar' }
  }
  if (confirmName.trim() !== companyName) {
    return { ok: false, error: 'El nombre no coincide con la compañía' }
  }
  return { ok: true }
}

export function mapPurgeCompanyRpcError(error: PurgeCompanyRpcError): {
  status: 403 | 404 | 500
  error: string
  logMessage?: string
} {
  const message = error.message || ''

  if (message.includes('not a soil company')) {
    return { status: 403, error: 'Solo se puede limpiar un laboratorio de suelo' }
  }
  if (error.code === '42501' || message.includes('not authorized')) {
    return { status: 403, error: 'Acceso denegado' }
  }
  if (error.code === 'P0002' || message.includes('company not found')) {
    return { status: 404, error: 'Compañía no encontrada' }
  }
  if (error.code === 'PGRST202' || error.code === '42883') {
    return {
      status: 500,
      error: 'Error al limpiar el laboratorio',
      logMessage:
        'Falta aplicar migrations/035_csx_purge_company_operational_data.sql.',
    }
  }

  return {
    status: 500,
    error: 'Error al limpiar el laboratorio',
    logMessage: message || 'Error desconocido al limpiar el laboratorio',
  }
}

function readCount(value: unknown): number | null {
  if (typeof value !== 'number' || !Number.isInteger(value) || value < 0) return null
  return value
}

function readOperationalCounts(data: unknown): SoilOperationalCounts | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const row = data as Record<string, unknown>
  const soilSamples = readCount(row.soil_samples)
  const soilResults = readCount(row.soil_results)
  const soilReports = readCount(row.soil_reports)
  if (soilSamples === null || soilResults === null || soilReports === null) return null
  return { soilSamples, soilResults, soilReports }
}

function readStoragePaths(data: unknown): string[] | null {
  if (!data || typeof data !== 'object' || Array.isArray(data)) return null
  const paths = (data as { storage_paths?: unknown }).storage_paths
  if (!Array.isArray(paths)) return null
  if (!paths.every((path) => typeof path === 'string' && path.length > 0)) return null
  return paths
}

function readConfirmName(body: unknown): unknown {
  if (!body || typeof body !== 'object' || Array.isArray(body)) return undefined
  return (body as { confirmName?: unknown }).confirmName
}

export async function executeCompanyOperationalCounts(
  companyId: string,
  dependencies: CompanyOperationalCountsDependencies
): Promise<CompanyOperationalCountsResult> {
  const parsedId = parseCompanyId(companyId)
  if (!parsedId.ok) {
    return { status: 404, body: { error: parsedId.error } }
  }

  const company = await dependencies.loadCompany(parsedId.companyId)
  if (!company) {
    return { status: 404, body: { error: 'Compañía no encontrada' } }
  }

  const { data, error } = await dependencies.countOperationalData(parsedId.companyId)
  if (error) {
    const mapped = mapPurgeCompanyRpcError(error)
    return {
      status: mapped.status,
      body: { error: mapped.error },
      logMessage: mapped.logMessage,
    }
  }

  const counts = readOperationalCounts(data)
  if (!counts) {
    return {
      status: 500,
      body: { error: 'Error al leer los datos del laboratorio' },
      logMessage: 'Respuesta vacía o incompleta de csx_company_operational_counts',
    }
  }

  return { status: 200, body: { counts } }
}

export async function executePurgeCompanyOperationalData(
  companyId: string,
  body: unknown,
  dependencies: PurgeCompanyOperationalDependencies
): Promise<PurgeCompanyOperationalResult> {
  const parsedId = parseCompanyId(companyId)
  if (!parsedId.ok) {
    return { status: 404, body: { error: parsedId.error } }
  }

  const company = await dependencies.loadCompany(parsedId.companyId)
  if (!company) {
    return { status: 404, body: { error: 'Compañía no encontrada' } }
  }

  const confirmation = confirmCompanyName(readConfirmName(body), company.name)
  if (!confirmation.ok) {
    return { status: 400, body: { error: confirmation.error } }
  }

  const { data, error } = await dependencies.purgeOperationalData(parsedId.companyId)
  if (error) {
    const mapped = mapPurgeCompanyRpcError(error)
    return {
      status: mapped.status,
      body: { error: mapped.error },
      logMessage: mapped.logMessage,
    }
  }

  const counts = readOperationalCounts(data)
  const storagePaths = readStoragePaths(data)
  if (!counts || !storagePaths) {
    return {
      status: 500,
      body: { error: 'Error al limpiar el laboratorio' },
      logMessage: 'Respuesta vacía o incompleta de csx_purge_company_operational_data',
    }
  }

  let failedStoragePaths: string[] = []
  try {
    failedStoragePaths = await dependencies.removeImportFiles(storagePaths)
  } catch (storageError) {
    failedStoragePaths = storagePaths
    const storageMessage =
      storageError instanceof Error ? storageError.message : 'Error desconocido al borrar archivos'
    return {
      status: 200,
      body: {
        counts,
        storageWarning: STORAGE_WARNING,
        failedStoragePaths,
      },
      logMessage: storageMessage,
    }
  }

  if (failedStoragePaths.length > 0) {
    return {
      status: 200,
      body: {
        counts,
        storageWarning: STORAGE_WARNING,
        failedStoragePaths,
      },
    }
  }

  return { status: 200, body: { counts } }
}
