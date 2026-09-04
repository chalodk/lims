import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { listCsxBillingCompanySnapshots } from '@/lib/services/companyUsageService'

async function assertCsxOrAdmin(
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

  if (roleName !== 'csx' && roleName !== 'admin') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { ok: true }
}

/**
 * GET /api/admin/billing/companies
 * Listado cross-company de uso vs plan (csx / admin).
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await assertCsxOrAdmin(supabase, user.id)
    if (!access.ok) return access.response

    const rows = await listCsxBillingCompanySnapshots(supabase)
    return NextResponse.json({ companies: rows })
  } catch (error) {
    console.error('Error en GET /api/admin/billing/companies:', error)
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : 'Error interno del servidor',
      },
      { status: 500 }
    )
  }
})
