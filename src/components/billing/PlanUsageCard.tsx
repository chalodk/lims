'use client'

import { CreditCard, Loader2 } from 'lucide-react'
import { BILLING_TIERS, formatTierPriceLabel } from '@/config/billingTiers'
import type { CompanyUsageSnapshot } from '@/lib/services/companyUsageService'

function formatLimit(value: number | null): string {
  return value === null ? 'Ilimitado' : String(value)
}

function percentLabel(ratio: number | null): string {
  if (ratio === null) return '—'
  return `${Math.min(999, Math.round(ratio * 100))}%`
}

interface PlanUsageCardProps {
  usage: CompanyUsageSnapshot | null
  isLoading?: boolean
  error?: string | null
}

export default function PlanUsageCard({ usage, isLoading, error }: PlanUsageCardProps) {
  if (isLoading) {
    return (
      <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 flex items-center gap-2 text-gray-500">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm">Cargando plan y uso…</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg border border-red-200 p-4 mb-6 text-sm text-red-700">
        {error}
      </div>
    )
  }

  if (!usage) {
    return null
  }

  const tierMeta = BILLING_TIERS[usage.planTier]
  const suggestedMeta = BILLING_TIERS[usage.suggestedTier]
  const tierPriceLabel = formatTierPriceLabel(usage.planTier)

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 mb-6 shadow-sm">
      <div className="flex items-start gap-3 mb-4">
        <div className="p-2 bg-green-100 rounded-lg">
          <CreditCard className="h-5 w-5 text-green-700" />
        </div>
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Plan y uso</h2>
          <p className="text-sm text-gray-500">
            {usage.companyName} · mes {usage.period.month}/{usage.period.year}
            {usage.isTrialActive && (
              <span className="ml-2 text-sky-700 font-medium">
                · Prueba ({usage.trialDaysRemaining}{' '}
                {usage.trialDaysRemaining === 1 ? 'día' : 'días'})
              </span>
            )}
            {usage.isTrialExpired && (
              <span className="ml-2 text-amber-700 font-medium">· Prueba finalizada</span>
            )}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
        <div>
          <p className="text-gray-500">Plan {usage.isTrialActive ? 'post-prueba' : 'actual'}</p>
          <p className="font-semibold text-gray-900">
            {tierMeta.label}
            {tierPriceLabel ? ` · ${tierPriceLabel}` : ''}
          </p>
        </div>
        <div>
          <p className="text-gray-500">Muestras este mes</p>
          <p className="font-semibold text-gray-900">
            {usage.samplesThisMonth} / {formatLimit(usage.limits.maxSamplesPerMonth)}
            <span className="ml-1 text-gray-400 font-normal">
              ({percentLabel(usage.samplesUsageRatio)})
            </span>
          </p>
        </div>
        <div>
          <p className="text-gray-500">Clientes</p>
          <p className="font-semibold text-gray-900">
            {usage.clientCount} / {formatLimit(usage.limits.maxClients)}
            <span className="ml-1 text-gray-400 font-normal">
              ({percentLabel(usage.clientsUsageRatio)})
            </span>
          </p>
        </div>
        <div>
          <p className="text-gray-500">Tier sugerido</p>
          <p className="font-semibold text-gray-900">
            {suggestedMeta.label}
            {usage.suggestedTier !== usage.planTier && (
              <span className="ml-1 text-amber-600 font-normal">(diferente al asignado)</span>
            )}
          </p>
        </div>
      </div>

      {usage.isTrialActive && (
        <p className="mt-4 text-xs text-sky-900 bg-sky-50 border border-sky-200 rounded-md px-3 py-2">
          Prueba gratuita activa con uso ilimitado. Quedan {usage.trialDaysRemaining}{' '}
          {usage.trialDaysRemaining === 1 ? 'día' : 'días'}.
        </p>
      )}

      {usage.isTrialExpired && !usage.isTrialActive && (
        <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          Tu prueba gratuita terminó. Aplica el plan {tierMeta.label}. Contacta a Agroanalytics para
          continuar; puedes seguir operando con normalidad.
        </p>
      )}

      {!usage.isTrialActive && !usage.isTrialExpired && usage.showSoftBanner && (
        <p className="mt-4 text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">
          {usage.overLimit
            ? 'Estás por encima del límite de tu plan. Contacta a Agroanalytics para un upgrade; puedes seguir operando con normalidad.'
            : 'Te estás acercando al límite de tu plan. Contacta a Agroanalytics si necesitas más capacidad.'}
        </p>
      )}
    </div>
  )
}
