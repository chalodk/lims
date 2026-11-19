import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import type { SessionVertical } from '@/config/verticals'
import { getCompanySessionVertical } from '@/lib/services/companyVerticals'
import {
  isDashboardCompanyId,
  loadDashboardActor,
  resolveSoilDashboardCompany,
} from '@/lib/services/dashboardCompany'
import { getSoilDashboard } from '@/lib/services/soilDashboard'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const actor = await loadDashboardActor(supabase, user.id)
    if (!actor) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const requestedCompanyId = new URL(request.url).searchParams.get('companyId')
    let vertical: SessionVertical = { status: 'none' }
    if (actor.roleName === 'csx') {
      if (!isDashboardCompanyId(requestedCompanyId)) {
        return NextResponse.json({ error: 'Elige el laboratorio' }, { status: 400 })
      }
      vertical = await getCompanySessionVertical(supabase, requestedCompanyId)
    } else if (actor.companyId) {
      vertical = await getCompanySessionVertical(supabase, actor.companyId)
    }

    const scope = resolveSoilDashboardCompany(actor, requestedCompanyId, vertical)
    if (!scope.ok) {
      return NextResponse.json({ error: scope.error }, { status: scope.status })
    }
    if (!scope.companyId) {
      return NextResponse.json({ error: 'Usuario sin laboratorio asignado' }, { status: 403 })
    }

    const dashboard = await getSoilDashboard(supabase, scope.companyId)
    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Error fetching soil dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
