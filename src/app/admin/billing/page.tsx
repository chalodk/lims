'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { BILLING_TIERS, PLAN_TIER_KEYS, TRIAL_DURATION_DAYS, formatTierPriceLabel, type PlanTier } from '@/config/billingTiers'
import type { CompanyUsageSnapshot } from '@/lib/services/companyUsageService'
import { CreditCard, Loader2, Save, Sparkles } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fieldClassName } from '@/components/ui/form-field-styles'

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
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <CreditCard className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Billing / Planes
            </h1>
            <p className="text-sm text-muted-foreground">
              Uso por compañía vs tier. Prueba gratuita {TRIAL_DURATION_DAYS} días · cobro manual.
            </p>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
        {successMsg ? (
          <div className="rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            {successMsg}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <CardTitle className="text-base">Compañías y planes</CardTitle>
            <CardDescription>
              {companies.length} compañía{companies.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compañía</TableHead>
                  <TableHead>Prueba</TableHead>
                  <TableHead>Muestras/mes</TableHead>
                  <TableHead>Clientes</TableHead>
                  <TableHead>Plan</TableHead>
                  <TableHead>Sugerido</TableHead>
                  <TableHead>Precio</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((row) => {
                  const draftTier = draftTiers[row.companyId] ?? row.planTier
                  const priceLabel = formatTierPriceLabel(draftTier)
                  const needsAttention =
                    row.overLimit ||
                    row.isTrialExpired ||
                    row.suggestedTier !== row.planTier
                  return (
                    <TableRow
                      key={row.companyId}
                      className={
                        row.isTrialActive
                          ? 'bg-sky-50/50'
                          : needsAttention
                            ? 'bg-amber-50/40'
                            : undefined
                      }
                    >
                      <TableCell className="font-medium text-foreground">
                        {row.companyName}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-muted-foreground">
                        {row.isTrialActive ? (
                          <span className="font-medium text-sky-700">
                            Activa · {row.trialDaysRemaining}d
                          </span>
                        ) : row.isTrialExpired ? (
                          <span className="text-amber-700">Vencida</span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.samplesThisMonth} / {formatLimit(row.limits.maxSamplesPerMonth)}
                        {row.samplesOverLimit ? (
                          <span className="ml-1 text-xs text-amber-700">over</span>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {row.clientCount} / {formatLimit(row.limits.maxClients)}
                        {row.clientsOverLimit ? (
                          <span className="ml-1 text-xs text-amber-700">over</span>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <select
                          value={draftTier}
                          onChange={(e) =>
                            setDraftTiers((prev) => ({
                              ...prev,
                              [row.companyId]: e.target.value as PlanTier,
                            }))
                          }
                          className={`${fieldClassName} h-8 w-auto`}
                        >
                          {PLAN_TIER_KEYS.map((tierKey) => (
                            <option key={tierKey} value={tierKey}>
                              {BILLING_TIERS[tierKey].label}
                            </option>
                          ))}
                        </select>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {BILLING_TIERS[row.suggestedTier].label}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {priceLabel ?? '—'}
                      </TableCell>
                      <TableCell>
                        <Input
                          type="text"
                          value={draftNotes[row.companyId] ?? ''}
                          onChange={(e) =>
                            setDraftNotes((prev) => ({
                              ...prev,
                              [row.companyId]: e.target.value,
                            }))
                          }
                          placeholder="Notas de facturación"
                          className="h-8 w-44"
                        />
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-col gap-1.5">
                          <Button
                            type="button"
                            onClick={() => void handleSave(row.companyId)}
                            disabled={savingId === row.companyId}
                            size="sm"
                            className="gap-1"
                          >
                            {savingId === row.companyId ? (
                              <Loader2 className="h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Save className="h-3.5 w-3.5" />
                            )}
                            Guardar
                          </Button>
                          {!row.isTrialActive ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              onClick={() =>
                                void handleStartTrial(row.companyId, row.companyName)
                              }
                              disabled={savingId === row.companyId}
                              className="gap-1"
                            >
                              <Sparkles className="h-3.5 w-3.5" />
                              Prueba {TRIAL_DURATION_DAYS}d
                            </Button>
                          ) : null}
                        </div>
                      </TableCell>
                    </TableRow>
                  )
                })}
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                      No hay compañías registradas
                    </TableCell>
                  </TableRow>
                ) : null}
              </TableBody>
            </Table>
          </div>
        </Card>
      </div>
    </DashboardLayout>
  )

}
