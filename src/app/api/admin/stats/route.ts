import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { getCompanyPlatformStats } from '@/lib/services/companyPlatformStats'

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
 * GET /api/admin/stats?company_id=
 * Uso de un lab (muestras e informes). Solo CSX.
 * Usa la sesión + RPC `csx_company_usage_stats` (migración 021).
 * No requiere SELECT CSX sobre samples/reports.
 */
export const GET = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const access = await assertCsx(supabase, user.id)
    if (!access.ok) return access.response

    const companyId = request.nextUrl.searchParams.get('company_id')?.trim()
    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
    }

    const stats = await getCompanyPlatformStats(supabase, companyId)
    return NextResponse.json(stats)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Error desconocido'
    if (message === 'Compañía no encontrada') {
      return NextResponse.json({ error: message }, { status: 404 })
    }
    console.error('Error en GET /api/admin/stats:', error)
    return NextResponse.json(
      { error: 'Error al obtener estadísticas', details: message },
      { status: 500 }
    )
  }
})
