import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  loadDashboardActor,
  pestDashboardReader,
  resolvePestDashboardCompany,
} from '@/lib/services/dashboardCompany'
import { getDashboardStats } from '@/lib/services/dashboardStats'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const actor = await loadDashboardActor(supabase, user.id)
    if (!actor) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const { searchParams } = new URL(request.url)
    const scope = resolvePestDashboardCompany(actor, searchParams.get('companyId'))
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status })
    }

    const reader = pestDashboardReader(actor.roleName) === 'service' ? createServiceRoleClient() : supabase
    const companyId = scope.companyId
    const completedDayStartParam = searchParams.get('completedDayStart')
    const completedDayEndParam = searchParams.get('completedDayEnd')
    const now = new Date()
    const completedRangeStart = completedDayStartParam
      ? new Date(completedDayStartParam)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const completedRangeEnd = completedDayEndParam
      ? new Date(completedDayEndParam)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

    const stats = await getDashboardStats(reader, {
      companyId,
      completedRangeStart,
      completedRangeEnd,
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
