'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BILLING_TIERS, PLAN_TIER_KEYS, TRIAL_DURATION_DAYS, formatTierPriceLabel, type PlanTier } from '@/config/billingTiers'
import type { CompanyUsageSnapshot } from '@/lib/services/companyUsageService'
import { CreditCard, Loader2, Save, Sparkles } from 'lucide-react'

function formatLimit(value: number | null): string {
  return value === null ? '∞' : String(value)
}

export default function AdminBillingPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyUsageSnapshot[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [draftTiers, setDraftTiers] = useState<Record<string, PlanTier>>({})
  const [draftNotes, setDraftNotes] = useState<Record<string, string>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/billing/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar billing')
      }
      const rows = (data.companies || []) as CompanyUsageSnapshot[]
      setCompanies(rows)
      const tiers: Record<string, PlanTier> = {}
      const notes: Record<string, string> = {}
      for (const row of rows) {
        tiers[row.companyId] = row.planTier
        notes[row.companyId] = row.billingNotes ?? ''
      }
      setDraftTiers(tiers)
      setDraftNotes(notes)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar billing')
      setCompanies([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (userRole !== 'csx' && userRole !== 'admin') {
      router.replace('/dashboard')
      return
    }
    void fetchCompanies()
  }, [authLoading, isAuthenticated, userRole, router, fetchCompanies])

  const handleSave = async (companyId: string) => {
    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/billing/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          plan_tier: draftTiers[companyId],
          billing_notes: draftNotes[companyId] ?? '',
        }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }
      const updated = data.company as CompanyUsageSnapshot
      setCompanies((prev) =>
        prev.map((row) => (row.companyId === companyId ? updated : row))
      )
      setDraftTiers((prev) => ({ ...prev, [companyId]: updated.planTier }))
      setDraftNotes((prev) => ({ ...prev, [companyId]: updated.billingNotes ?? '' }))
      setSuccessMsg(`Plan actualizado: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingId(null)
    }
  }

  const handleStartTrial = async (companyId: string, companyName: string) => {
    if (
      !confirm(
        `¿Iniciar prueba gratuita de ${TRIAL_DURATION_DAYS} días para "${companyName}"?\n\nPlan post-prueba: Growth.`
      )
    ) {
      return
    }
    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/billing/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ start_trial: true }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al iniciar prueba')
      }
      const updated = data.company as CompanyUsageSnapshot
      setCompanies((prev) =>
        prev.map((row) => (row.companyId === companyId ? updated : row))
      )
      setDraftTiers((prev) => ({ ...prev, [companyId]: updated.planTier }))
      setSuccessMsg(`Prueba de ${TRIAL_DURATION_DAYS} días iniciada: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al iniciar prueba')
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-6 flex items-start gap-3">
          <div className="p-2 bg-green-100 rounded-lg">
            <CreditCard className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Billing / Planes</h1>
            <p className="text-gray-600">
              Uso por compañía vs tier. Prueba gratuita {TRIAL_DURATION_DAYS} días · cobro manual.
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-4 rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        )}
        {successMsg && (
          <div className="mb-4 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        )}

        <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 text-sm">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Compañía</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Prueba</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Muestras/mes</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Clientes</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Plan</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Sugerido</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Precio</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Notas</th>
                <th className="px-4 py-3 text-left font-medium text-gray-500">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {companies.map((row) => {
                const draftTier = draftTiers[row.companyId] ?? row.planTier
                const priceLabel = formatTierPriceLabel(draftTier)
                const needsAttention =
                  row.overLimit ||
                  row.isTrialExpired ||
                  row.suggestedTier !== row.planTier
                return (
                  <tr
                    key={row.companyId}
                    className={
                      row.isTrialActive
                        ? 'bg-sky-50/50'
                        : needsAttention
                          ? 'bg-amber-50/40'
                          : undefined
                    }
                  >
                    <td className="px-4 py-3 font-medium text-gray-900">{row.companyName}</td>
                    <td className="px-4 py-3 text-gray-700 whitespace-nowrap">
                      {row.isTrialActive ? (
                        <span className="text-sky-700 font-medium">
                          Activa · {row.trialDaysRemaining}d
                        </span>
                      ) : row.isTrialExpired ? (
                        <span className="text-amber-700">Vencida</span>
                      ) : (
                        <span className="text-gray-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.samplesThisMonth} / {formatLimit(row.limits.maxSamplesPerMonth)}
                      {row.samplesOverLimit && (
                        <span className="ml-1 text-amber-700 text-xs">over</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {row.clientCount} / {formatLimit(row.limits.maxClients)}
                      {row.clientsOverLimit && (
                        <span className="ml-1 text-amber-700 text-xs">over</span>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={draftTier}
                        onChange={(e) =>
                          setDraftTiers((prev) => ({
                            ...prev,
                            [row.companyId]: e.target.value as PlanTier,
                          }))
                        }
                        className="border border-gray-300 rounded-md px-2 py-1"
                      >
                        {PLAN_TIER_KEYS.map((tierKey) => (
                          <option key={tierKey} value={tierKey}>
                            {BILLING_TIERS[tierKey].label}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="px-4 py-3 text-gray-700">
                      {BILLING_TIERS[row.suggestedTier].label}
                    </td>
                    <td className="px-4 py-3 text-gray-700">{priceLabel ?? '—'}</td>
                    <td className="px-4 py-3">
                      <input
                        type="text"
                        value={draftNotes[row.companyId] ?? ''}
                        onChange={(e) =>
                          setDraftNotes((prev) => ({
                            ...prev,
                            [row.companyId]: e.target.value,
                          }))
                        }
                        placeholder="Notas de facturación"
                        className="w-44 border border-gray-300 rounded-md px-2 py-1"
                      />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-col gap-1.5">
                        <button
                          type="button"
                          onClick={() => void handleSave(row.companyId)}
                          disabled={savingId === row.companyId}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md bg-green-600 text-white hover:bg-green-700 disabled:opacity-50"
                        >
                          {savingId === row.companyId ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <Save className="h-3.5 w-3.5" />
                          )}
                          Guardar
                        </button>
                        {!row.isTrialActive && (
                          <button
                            type="button"
                            onClick={() => void handleStartTrial(row.companyId, row.companyName)}
                            disabled={savingId === row.companyId}
                            className="inline-flex items-center gap-1 px-3 py-1.5 rounded-md border border-sky-300 text-sky-800 bg-sky-50 hover:bg-sky-100 disabled:opacity-50"
                          >
                            <Sparkles className="h-3.5 w-3.5" />
                            Prueba {TRIAL_DURATION_DAYS}d
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                )
              })}
              {companies.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-8 text-center text-gray-500">
                    No hay compañías registradas
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  )
}
