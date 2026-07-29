import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/auth/api-auth'
import {
  buildUsageSnapshot,
  countClientsForCompany,
  countSamplesThisMonth,
} from '@/lib/services/companyUsageService'

function createServiceClient() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  )
}

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

    const adminClient = createServiceClient()
    const { data: companies, error: companiesError } = await adminClient
      .from('companies')
      .select('id, name, plan_tier, billing_notes, plan_updated_at, trial_started_at, trial_ends_at')
      .order('name')

    if (companiesError) {
      console.error('Error fetching companies for billing:', companiesError)
      return NextResponse.json({ error: 'Error al obtener companies' }, { status: 500 })
    }

    const rows = await Promise.all(
      (companies || []).map(async (company) => {
        const [samplesThisMonth, clientCount] = await Promise.all([
          countSamplesThisMonth(adminClient, company.id),
          countClientsForCompany(adminClient, company.id),
        ])

        return buildUsageSnapshot({
          companyId: company.id,
          companyName: company.name,
          planTier: company.plan_tier,
          billingNotes: company.billing_notes,
          trialStartedAt: company.trial_started_at,
          trialEndsAt: company.trial_ends_at,
          samplesThisMonth,
          clientCount,
        })
      })
    )

    return NextResponse.json({ companies: rows })
  } catch (error) {
    console.error('Error en GET /api/admin/billing/companies:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
