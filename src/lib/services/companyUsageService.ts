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

export function currentMonthBounds(referenceDate: Date = new Date()): {
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

export type BillingUsageRpcRow = {
  id?: string
  name?: string
  plan_tier?: string | null
  billing_notes?: string | null
  trial_started_at?: string | null
  trial_ends_at?: string | null
  samples_this_month?: number
  client_count?: number
}

const MISSING_BILLING_RPC_MESSAGE =
  'Falta aplicar migrations/024_csx_billing_companies_usage.sql en Supabase (función csx_billing_companies_usage).'

function isMissingBillingRpcError(error: { code?: string; message?: string }): boolean {
  const message = error.message || ''
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    message.includes('csx_billing_companies_usage') ||
    message.toLowerCase().includes('could not find the function')
  )
}

export function snapshotFromBillingRpcRow(
  row: BillingUsageRpcRow,
  referenceDate: Date = new Date()
): CompanyUsageSnapshot {
  if (!row.id || !row.name) {
    throw new Error('Fila de billing incompleta')
  }

  return buildUsageSnapshot({
    companyId: row.id,
    companyName: row.name,
    planTier: row.plan_tier,
    billingNotes: row.billing_notes,
    trialStartedAt: row.trial_started_at,
    trialEndsAt: row.trial_ends_at,
    samplesThisMonth: Number(row.samples_this_month) || 0,
    clientCount: Number(row.client_count) || 0,
    referenceDate,
  })
}

export async function listCsxBillingCompanySnapshots(
  supabase: SupabaseClient,
  options: { companyId?: string; referenceDate?: Date } = {}
): Promise<CompanyUsageSnapshot[]> {
  const referenceDate = options.referenceDate ?? new Date()
  const period = currentMonthBounds(referenceDate)
  const { data, error } = await supabase.rpc('csx_billing_companies_usage', {
    p_this_start: period.startIso,
    p_this_end: period.endIso,
    p_company_id: options.companyId ?? null,
  })

  if (error) {
    if (isMissingBillingRpcError(error)) {
      throw new Error(MISSING_BILLING_RPC_MESSAGE)
    }
    throw new Error(error.message)
  }

  const rows = Array.isArray(data) ? (data as BillingUsageRpcRow[]) : []
  return rows.map((row) => snapshotFromBillingRpcRow(row, referenceDate))
}
