import type { SupabaseClient } from '@supabase/supabase-js'
import {
  BILLING_TIERS,
  getTierLimits,
  getTrialState,
  isNearLimit,
  isOverLimit,
  resolvePlanTier,
  suggestTier,
  usageRatio,
  type PlanTier,
} from '@/config/billingTiers'

export interface CompanyUsageSnapshot {
  companyId: string
  companyName: string
  planTier: PlanTier
  billingNotes: string | null
  priceMonthlyUsd: number
  samplesThisMonth: number
  clientCount: number
  limits: {
    maxSamplesPerMonth: number | null
    maxClients: number | null
  }
  samplesUsageRatio: number | null
  clientsUsageRatio: number | null
  samplesOverLimit: boolean
  clientsOverLimit: boolean
  samplesNearLimit: boolean
  clientsNearLimit: boolean
  overLimit: boolean
  nearLimit: boolean
  suggestedTier: PlanTier
  showSoftBanner: boolean
  trialStartedAt: string | null
  trialEndsAt: string | null
  isTrialActive: boolean
  isTrialExpired: boolean
  trialDaysRemaining: number | null
  period: {
    year: number
    month: number
    startIso: string
    endIso: string
  }
}

function currentMonthBounds(referenceDate: Date = new Date()): {
  year: number
  month: number
  startIso: string
  endIso: string
} {
  const year = referenceDate.getFullYear()
  const month = referenceDate.getMonth()
  const start = new Date(year, month, 1, 0, 0, 0, 0)
  const end = new Date(year, month + 1, 1, 0, 0, 0, 0)
  return {
    year,
    month: month + 1,
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export async function countSamplesThisMonth(
  supabase: SupabaseClient,
  companyId: string,
  period = currentMonthBounds()
): Promise<number> {
  const { count, error } = await supabase
    .from('samples')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)
    .gte('created_at', period.startIso)
    .lt('created_at', period.endIso)

  if (error) {
    throw new Error(`Error contando muestras del mes: ${error.message}`)
  }

  return count ?? 0
}

export async function countClientsForCompany(
  supabase: SupabaseClient,
  companyId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('clients')
    .select('id', { count: 'exact', head: true })
    .eq('company_id', companyId)

  if (error) {
    throw new Error(`Error contando clientes: ${error.message}`)
  }

  return count ?? 0
}

export function buildUsageSnapshot(input: {
  companyId: string
  companyName: string
  planTier: string | null | undefined
  billingNotes?: string | null
  trialStartedAt?: string | null
  trialEndsAt?: string | null
  samplesThisMonth: number
  clientCount: number
  referenceDate?: Date
}): CompanyUsageSnapshot {
  const referenceDate = input.referenceDate ?? new Date()
  const planTier: PlanTier = resolvePlanTier(input.planTier)
  const trial = getTrialState(input.trialEndsAt, referenceDate)

  // Durante trial: límites ilimitados (enterprise). Fuera: límites del plan asignado.
  const effectiveTier: PlanTier = trial.isTrialActive ? 'enterprise' : planTier
  const limits = getTierLimits(effectiveTier)
  const period = currentMonthBounds(referenceDate)
  const suggested = suggestTier(input.samplesThisMonth, input.clientCount)

  const samplesOver = isOverLimit(input.samplesThisMonth, limits.maxSamplesPerMonth)
  const clientsOver = isOverLimit(input.clientCount, limits.maxClients)
  const samplesNear = isNearLimit(input.samplesThisMonth, limits.maxSamplesPerMonth)
  const clientsNear = isNearLimit(input.clientCount, limits.maxClients)
  const overLimit = samplesOver || clientsOver
  const nearLimit = samplesNear || clientsNear

  const showSoftBanner =
    trial.isTrialActive || trial.isTrialExpired || overLimit || nearLimit

  return {
    companyId: input.companyId,
    companyName: input.companyName,
    planTier,
    billingNotes: input.billingNotes ?? null,
    priceMonthlyUsd: BILLING_TIERS[planTier].priceMonthlyUsd,
    samplesThisMonth: input.samplesThisMonth,
    clientCount: input.clientCount,
    limits: {
      maxSamplesPerMonth: limits.maxSamplesPerMonth,
      maxClients: limits.maxClients,
    },
    samplesUsageRatio: usageRatio(input.samplesThisMonth, limits.maxSamplesPerMonth),
    clientsUsageRatio: usageRatio(input.clientCount, limits.maxClients),
    samplesOverLimit: samplesOver,
    clientsOverLimit: clientsOver,
    samplesNearLimit: samplesNear,
    clientsNearLimit: clientsNear,
    overLimit,
    nearLimit,
    suggestedTier: suggested,
    showSoftBanner,
    trialStartedAt: input.trialStartedAt ?? null,
    trialEndsAt: input.trialEndsAt ?? null,
    isTrialActive: trial.isTrialActive,
    isTrialExpired: trial.isTrialExpired,
    trialDaysRemaining: trial.trialDaysRemaining,
    period,
  }
}

/**
 * Obtiene el snapshot de uso de una company.
 */
export async function getCompanyUsage(
  supabase: SupabaseClient,
  companyId: string
): Promise<CompanyUsageSnapshot> {
  const period = currentMonthBounds()

  const { data: company, error: companyError } = await supabase
    .from('companies')
    .select('id, name, plan_tier, billing_notes, trial_started_at, trial_ends_at')
    .eq('id', companyId)
    .single()

  if (companyError || !company) {
    throw new Error(companyError?.message || 'Compañía no encontrada')
  }

  const [samplesThisMonth, clientCount] = await Promise.all([
    countSamplesThisMonth(supabase, companyId, period),
    countClientsForCompany(supabase, companyId),
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
}
