import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { getCompanyUsage } from '@/lib/services/companyUsageService'

/**
 * GET /api/billing/usage
 * Uso del plan de la compañía del usuario autenticado (soft limits, solo lectura).
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('company_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (!['admin', 'validador', 'comun'].includes(roleName ?? '')) {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ error: 'Usuario sin compañía asignada' }, { status: 400 })
    }

    const usage = await getCompanyUsage(supabase, currentUser.company_id)
    return NextResponse.json({ usage })
  } catch (error) {
    console.error('Error en GET /api/billing/usage:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener uso del plan',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
