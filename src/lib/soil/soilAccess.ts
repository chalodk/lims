const LAB_ROLES = ['admin', 'validador', 'comun'] as const

export type SoilAccessResult =
  | { ok: true; companyId: string; roleName: string }
  | { ok: false; status: 403 | 500; error: string }

export interface SoilAccessDependencies {
  loadUserProfile: () => Promise<{ companyId: string | null; roleName: string | null } | null>
  companyHasSoilVertical: () => Promise<boolean>
}

/**
 * Usuario de laboratorio (admin, validador, comun) de una company con la vertical suelo activa.
 * La RLS de soil_* aplica la misma regla; esto entrega un error legible antes de consultar.
 */
export async function resolveSoilLabAccess(
  dependencies: SoilAccessDependencies
): Promise<SoilAccessResult> {
  const profile = await dependencies.loadUserProfile()
  if (!profile) {
    return { ok: false, status: 500, error: 'Error al obtener información del usuario' }
  }
  if (!profile.companyId) {
    return { ok: false, status: 403, error: 'Usuario sin laboratorio asignado' }
  }
  if (!profile.roleName || !(LAB_ROLES as readonly string[]).includes(profile.roleName)) {
    return { ok: false, status: 403, error: 'Acceso denegado' }
  }
  if (!(await dependencies.companyHasSoilVertical())) {
    return {
      ok: false,
      status: 403,
      error: 'Tu laboratorio no tiene habilitada la vertical de suelo',
    }
  }
  return { ok: true, companyId: profile.companyId, roleName: profile.roleName }
}
