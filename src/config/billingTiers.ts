/**
 * Fuente única de verdad para tiers de uso y cobro manual.
 * Límites OR: se sugiere el tier mayor requerido por muestras/mes o clientes.
 */

export const PLAN_TIER_KEYS = ['starter', 'growth', 'enterprise'] as const

export type PlanTier = (typeof PLAN_TIER_KEYS)[number]

export interface BillingTierLimits {
  /** null = ilimitado */
  maxSamplesPerMonth: number | null
  /** null = ilimitado */
  maxClients: number | null
  priceMonthlyUsd: number
  label: string
}

export const BILLING_TIERS: Record<PlanTier, BillingTierLimits> = {
  starter: {
    maxSamplesPerMonth: 500,
    maxClients: 50,
    priceMonthlyUsd: 300,
    label: 'Starter',
  },
  growth: {
    maxSamplesPerMonth: 2000,
    maxClients: 200,
    priceMonthlyUsd: 600,
    label: 'Growth',
  },
  enterprise: {
    maxSamplesPerMonth: null,
    maxClients: null,
    priceMonthlyUsd: 1200,
    label: 'Enterprise',
  },
}

/** Umbral soft para mostrar aviso (80% del límite). */
export const USAGE_WARNING_RATIO = 0.8

/** Días de prueba gratuita. */
export const TRIAL_DURATION_DAYS = 14

/** Plan comercial por defecto (post-prueba / onboarding). */
export const DEFAULT_PLAN_TIER: PlanTier = 'growth'

export function isPlanTier(value: unknown): value is PlanTier {
  return typeof value === 'string' && (PLAN_TIER_KEYS as readonly string[]).includes(value)
}

export function resolvePlanTier(value: string | null | undefined): PlanTier {
  return isPlanTier(value) ? value : DEFAULT_PLAN_TIER
}

export function getTierLimits(tier: PlanTier): BillingTierLimits {
  return BILLING_TIERS[tier]
}

/** Precio para UI. Enterprise no publica monto. */
export function formatTierPriceLabel(tier: PlanTier): string | null {
  if (tier === 'enterprise') return null
  return `$${BILLING_TIERS[tier].priceMonthlyUsd}/mes`
}

export function computeTrialEndDate(
  fromDate: Date = new Date(),
  durationDays: number = TRIAL_DURATION_DAYS
): Date {
  const end = new Date(fromDate.getTime())
  end.setUTCDate(end.getUTCDate() + durationDays)
  return end
}

export function getTrialState(
  trialEndsAt: string | null | undefined,
  referenceDate: Date = new Date()
): {
  isTrialActive: boolean
  isTrialExpired: boolean
  trialDaysRemaining: number | null
} {
  if (!trialEndsAt) {
    return { isTrialActive: false, isTrialExpired: false, trialDaysRemaining: null }
  }

  const endsAtMs = new Date(trialEndsAt).getTime()
  if (Number.isNaN(endsAtMs)) {
    return { isTrialActive: false, isTrialExpired: false, trialDaysRemaining: null }
  }

  const remainingMs = endsAtMs - referenceDate.getTime()
  if (remainingMs > 0) {
    const days = Math.ceil(remainingMs / (1000 * 60 * 60 * 24))
    return {
      isTrialActive: true,
      isTrialExpired: false,
      trialDaysRemaining: Math.max(1, days),
    }
  }

  return { isTrialActive: false, isTrialExpired: true, trialDaysRemaining: 0 }
}

/**
 * Tier mínimo requerido por el uso actual (lógica OR).
 */
export function suggestTier(samplesThisMonth: number, clientCount: number): PlanTier {
  const needsEnterprise =
    samplesThisMonth > (BILLING_TIERS.growth.maxSamplesPerMonth as number) ||
    clientCount > (BILLING_TIERS.growth.maxClients as number)

  if (needsEnterprise) {
    return 'enterprise'
  }

  const needsGrowth =
    samplesThisMonth > (BILLING_TIERS.starter.maxSamplesPerMonth as number) ||
    clientCount > (BILLING_TIERS.starter.maxClients as number)

  if (needsGrowth) {
    return 'growth'
  }

  return 'starter'
}

export function usageRatio(used: number, limit: number | null): number | null {
  if (limit === null || limit <= 0) return null
  return used / limit
}

export function isOverLimit(used: number, limit: number | null): boolean {
  if (limit === null) return false
  return used > limit
}

export function isNearLimit(used: number, limit: number | null): boolean {
  const ratio = usageRatio(used, limit)
  if (ratio === null) return false
  return ratio >= USAGE_WARNING_RATIO
}
