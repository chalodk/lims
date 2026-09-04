import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { parseFeatureFlagOverrides, resolveCompanyFeatures } from '@/config/featureFlags'

async function assertCsx(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('role_id, roles(name)')
    .eq('id', userId)
    .single()

  if (userError || !currentUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 }),
    }
  }

  type RoleData = { name: string } | { name: string }[]
  const roleData = currentUser.roles as RoleData
  const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

  if (roleName !== 'csx') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { ok: true }
}

/**
 * GET /api/admin/features/companies
 * Listado cross-company de flags resueltos (csx).
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await assertCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, feature_flags')
      .order('name')

    if (companiesError) {
      console.error('Error fetching companies for features:', companiesError)
      return NextResponse.json(
        { error: 'Error al obtener companies', details: companiesError.message },
        { status: 500 }
      )
    }

    const rows = (companies || []).map((company) => ({
      companyId: company.id,
      companyName: company.name,
      flags: resolveCompanyFeatures(parseFeatureFlagOverrides(company.feature_flags)),
    }))

    return NextResponse.json({ companies: rows })
  } catch (error) {
    console.error('Error en GET /api/admin/features/companies:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
