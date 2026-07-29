import { NextRequest, NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/auth/api-auth'
import {
  computeTrialEndDate,
  DEFAULT_PLAN_TIER,
  isPlanTier,
  TRIAL_DURATION_DAYS,
} from '@/config/billingTiers'
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

/**
 * PATCH /api/admin/billing/companies/[id]
 * Actualiza plan_tier, billing_notes y/o inicia/limpia prueba gratuita.
 */
export const PATCH = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const { id: companyId } = await (params as Promise<{ id: string }>)

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (roleName !== 'csx' && roleName !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const updatePayload: Record<string, string | null> = {}

    if (body.plan_tier !== undefined) {
      if (!isPlanTier(body.plan_tier)) {
        return NextResponse.json(
          { error: 'plan_tier inválido. Use starter, growth o enterprise' },
          { status: 400 }
        )
      }
      updatePayload.plan_tier = body.plan_tier
      updatePayload.plan_updated_at = new Date().toISOString()
      updatePayload.plan_updated_by = user.id
    }

    if (body.billing_notes !== undefined) {
      updatePayload.billing_notes =
        typeof body.billing_notes === 'string' ? body.billing_notes : null
    }

    if (body.start_trial === true) {
      const startedAt = new Date()
      updatePayload.trial_started_at = startedAt.toISOString()
      updatePayload.trial_ends_at = computeTrialEndDate(startedAt, TRIAL_DURATION_DAYS).toISOString()
      if (body.plan_tier === undefined && updatePayload.plan_tier === undefined) {
        updatePayload.plan_tier = DEFAULT_PLAN_TIER
        updatePayload.plan_updated_at = startedAt.toISOString()
        updatePayload.plan_updated_by = user.id
      }
    }

    if (body.clear_trial === true) {
      updatePayload.trial_started_at = null
      updatePayload.trial_ends_at = null
    }

    if (Object.keys(updatePayload).length === 0) {
      return NextResponse.json(
        { error: 'Debe enviar plan_tier, billing_notes, start_trial o clear_trial' },
        { status: 400 }
      )
    }

    const adminClient = createServiceClient()
    const { data: updatedCompany, error: updateError } = await adminClient
      .from('companies')
      .update(updatePayload)
      .eq('id', companyId)
      .select('id, name, plan_tier, billing_notes, plan_updated_at, trial_started_at, trial_ends_at')
      .single()

    if (updateError || !updatedCompany) {
      console.error('Error updating company billing:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar el plan de la compañía', details: updateError?.message },
        { status: 500 }
      )
    }

    const [samplesThisMonth, clientCount] = await Promise.all([
      countSamplesThisMonth(adminClient, updatedCompany.id),
      countClientsForCompany(adminClient, updatedCompany.id),
    ])

    const usage = buildUsageSnapshot({
      companyId: updatedCompany.id,
      companyName: updatedCompany.name,
      planTier: updatedCompany.plan_tier,
      billingNotes: updatedCompany.billing_notes,
      trialStartedAt: updatedCompany.trial_started_at,
      trialEndsAt: updatedCompany.trial_ends_at,
      samplesThisMonth,
      clientCount,
    })

    return NextResponse.json({ company: usage })
  } catch (error) {
    console.error('Error en PATCH /api/admin/billing/companies/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
