'use client'

import { AlertTriangle, Sparkles } from 'lucide-react'
import { BILLING_TIERS, formatTierPriceLabel } from '@/config/billingTiers'
import type { CompanyUsageSnapshot } from '@/lib/services/companyUsageService'

function formatLimit(value: number | null): string {
  return value === null ? 'Ilimitado' : String(value)
}

interface PlanUsageBannerProps {
  usage: CompanyUsageSnapshot | null
  /** 'samples' enfatiza métrica de muestras; 'clients' la de clientes; 'both' ambas */
  focus?: 'samples' | 'clients' | 'both'
}

/**
 * Banner soft (no bloquea). Trial, trial vencido, o near/over limit.
 */
export default function PlanUsageBanner({ usage, focus = 'both' }: PlanUsageBannerProps) {
  if (!usage || !usage.showSoftBanner) {
    return null
  }

  if (usage.isTrialActive) {
    const days = usage.trialDaysRemaining ?? 0
    const postTrialPrice = formatTierPriceLabel(usage.planTier)
    return (
      <div
        className="mb-6 rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 flex gap-3 text-sky-950"
        role="status"
      >
        <Sparkles className="h-5 w-5 flex-shrink-0 mt-0.5 text-sky-600" />
        <div className="text-sm space-y-1">
          <p className="font-medium">
            Prueba gratuita activa · {days === 1 ? 'queda 1 día' : `quedan ${days} días`}
          </p>
          <p className="text-xs opacity-90">
            Durante la prueba tienes uso ilimitado. Al terminar se aplicará el plan{' '}
            <span className="font-semibold">{BILLING_TIERS[usage.planTier].label}</span>
            {postTrialPrice ? ` (${postTrialPrice})` : ''}
            . Contacta a Agroanalytics para continuar.
          </p>
        </div>
      </div>
    )
  }

  if (usage.isTrialExpired && !usage.overLimit && !usage.nearLimit) {
    return (
      <div
        className="mb-6 rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 flex gap-3 text-amber-950"
        role="status"
      >
        <AlertTriangle className="h-5 w-5 flex-shrink-0 mt-0.5 text-amber-600" />
        <div className="text-sm space-y-1">
          <p className="font-medium">Tu prueba gratuita terminó</p>
          <p className="text-xs opacity-90">
            Ahora aplica el plan{' '}
            <span className="font-semibold">{BILLING_TIERS[usage.planTier].label}</span>. Contacta a
            Agroanalytics para activar o ajustar tu plan. Puedes seguir operando con normalidad.
          </p>
        </div>
      </div>
    )
  }

  const tierLabel = BILLING_TIERS[usage.planTier].label
  const suggestedLabel = BILLING_TIERS[usage.suggestedTier].label
  const isOver = usage.overLimit

  const samplesLine = `Muestras este mes: ${usage.samplesThisMonth} / ${formatLimit(usage.limits.maxSamplesPerMonth)}`
  const clientsLine = `Clientes: ${usage.clientCount} / ${formatLimit(usage.limits.maxClients)}`

  let metricLines: string[] = []
  if (focus === 'samples') {
    metricLines = [samplesLine]
    if (usage.clientsNearLimit || usage.clientsOverLimit) {
      metricLines.push(clientsLine)
    }
  } else if (focus === 'clients') {
    metricLines = [clientsLine]
    if (usage.samplesNearLimit || usage.samplesOverLimit) {
      metricLines.push(samplesLine)
    }
  } else {
    metricLines = [samplesLine, clientsLine]
  }

  const expiredPrefix = usage.isTrialExpired ? 'Tu prueba terminó. ' : ''

  return (
    <div
      className={`mb-6 rounded-lg border px-4 py-3 flex gap-3 ${
        isOver
          ? 'bg-amber-50 border-amber-300 text-amber-950'
          : 'bg-yellow-50 border-yellow-200 text-yellow-950'
      }`}
      role="status"
    >
      <AlertTriangle
        className={`h-5 w-5 flex-shrink-0 mt-0.5 ${isOver ? 'text-amber-600' : 'text-yellow-600'}`}
      />
      <div className="text-sm space-y-1">
        <p className="font-medium">
          {expiredPrefix}
          {isOver
            ? `Tu plan ${tierLabel} está por encima del límite de uso`
            : `Te estás acercando al límite de tu plan ${tierLabel}`}
        </p>
        {metricLines.map((line) => (
          <p key={line} className="text-xs opacity-90">
            {line}
          </p>
        ))}
        <p className="text-xs opacity-90">
          Tier sugerido: <span className="font-semibold">{suggestedLabel}</span>
          {' · '}
          Contacta a Agroanalytics para actualizar tu plan. Puedes seguir creando registros con normalidad.
        </p>
      </div>
    </div>
  )
}
