import type { SupabaseClient } from '@supabase/supabase-js'
import type { SessionVertical } from '@/config/verticals'

const COMPANY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export type DashboardActor = {
  roleName: string | null
  companyId: string | null
}

export type DashboardCompanyScope =
  | { ok: true; companyId: string | null }
  | { ok: false; status: 400 | 403; error: string }

export type DashboardReader = 'session' | 'service'

type RoleJoin = { name: string } | { name: string }[] | null

export function isDashboardCompanyId(value: string | null | undefined): value is string {
  return typeof value === 'string' && COMPANY_ID_PATTERN.test(value)
}

function roleNameFromJoin(roles: RoleJoin): string | null {
  if (!roles) return null
  const role = Array.isArray(roles) ? roles[0] : roles
  return role?.name ?? null
}

/**
 * CSX no tiene SELECT de samples/results/reports (021). El dashboard de un
 * laboratorio elegido se lee con la service role, siempre filtrado por ese id.
 * Un laboratorio sigue usando su sesión.
 */
export function pestDashboardReader(roleName: string | null): DashboardReader {
  return roleName === 'csx' ? 'service' : 'session'
}

export function resolvePestDashboardCompany(
  actor: DashboardActor,
  requestedCompanyId: string | null
): DashboardCompanyScope {
  if (actor.roleName === 'csx') {
    if (!isDashboardCompanyId(requestedCompanyId)) {
      return { ok: false, status: 400, error: 'Elige el laboratorio' }
    }
    return { ok: true, companyId: requestedCompanyId }
  }
  return { ok: true, companyId: actor.companyId }
}

export function resolveSoilDashboardCompany(
  actor: DashboardActor,
  requestedCompanyId: string | null,
  vertical: SessionVertical
): DashboardCompanyScope {
  const soilAssigned = vertical.status === 'assigned' && vertical.key === 'suelo'

  if (actor.roleName === 'csx') {
    if (!isDashboardCompanyId(requestedCompanyId)) {
      return { ok: false, status: 400, error: 'Elige el laboratorio' }
    }
    if (!soilAssigned) {
      return { ok: false, status: 400, error: 'El laboratorio elegido no es de suelo' }
    }
    return { ok: true, companyId: requestedCompanyId }
  }

  if (!actor.companyId) {
    return { ok: false, status: 403, error: 'Usuario sin laboratorio asignado' }
  }
  if (!soilAssigned) {
    return { ok: false, status: 403, error: 'Tu laboratorio no tiene habilitada la vertical de suelo' }
  }
  return { ok: true, companyId: actor.companyId }
}

export async function loadDashboardActor(
  supabase: SupabaseClient,
  userId: string
): Promise<DashboardActor | null> {
  const { data, error } = await supabase
    .from('users')
    .select('company_id, roles(name)')
    .eq('id', userId)
    .single()

  if (error || !data) return null

  const companyId = typeof data.company_id === 'string' ? data.company_id : null
  return {
    roleName: roleNameFromJoin(data.roles as RoleJoin),
    companyId,
  }
}
