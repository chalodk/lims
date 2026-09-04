'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  FEATURE_FLAG_KEYS,
  FEATURE_FLAG_REGISTRY,
  type FeatureFlagKey,
  type ResolvedFeatureFlags,
} from '@/config/featureFlags'
import { Loader2, Save, SlidersHorizontal } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

interface CompanyFeaturesRow {
  companyId: string
  companyName: string
  flags: ResolvedFeatureFlags
}

function emptyDraft(): Record<FeatureFlagKey, boolean> {
  return {
    producer_portal: true,
    ai_reports: false,
    payments: false,
  }
}

export default function AdminFeaturesPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyFeaturesRow[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [draftFlags, setDraftFlags] = useState<Record<string, ResolvedFeatureFlags>>({})
  const [savingId, setSavingId] = useState<string | null>(null)

  const fetchCompanies = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/features/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar features')
      }
      const rows = (data.companies || []) as CompanyFeaturesRow[]
      setCompanies(rows)
      const drafts: Record<string, ResolvedFeatureFlags> = {}
      for (const row of rows) {
        drafts[row.companyId] = { ...row.flags }
      }
      setDraftFlags(drafts)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar features')
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
    if (userRole !== 'csx') {
      router.replace('/dashboard')
      return
    }
    void fetchCompanies()
  }, [authLoading, isAuthenticated, userRole, router, fetchCompanies])

  const updateDraftFlag = (companyId: string, key: FeatureFlagKey, enabled: boolean) => {
    setDraftFlags((prev) => {
      const current = prev[companyId] ?? emptyDraft()
      const next: ResolvedFeatureFlags = { ...current, [key]: enabled }
      if (key === 'producer_portal' && !enabled) {
        next.payments = false
      }
      if (key === 'payments' && enabled) {
        next.producer_portal = true
      }
      return { ...prev, [companyId]: next }
    })
  }

  const handleSave = async (companyId: string) => {
    const draft = draftFlags[companyId]
    if (!draft) return

    setSavingId(companyId)
    setSuccessMsg(null)
    setError(null)
    try {
      const response = await fetch(`/api/admin/features/companies/${companyId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ flags: draft }),
      })
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al guardar')
      }
      const updated = data.company as CompanyFeaturesRow
      setCompanies((prev) =>
        prev.map((row) => (row.companyId === companyId ? updated : row))
      )
      setDraftFlags((prev) => ({ ...prev, [companyId]: { ...updated.flags } }))
      setSuccessMsg(`Features actualizadas: ${updated.companyName}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al guardar')
    } finally {
      setSavingId(null)
    }
  }

  if (authLoading || isLoading) {
    return (
      <DashboardLayout>
        <div className="flex min-h-screen items-center justify-center">
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
            <SlidersHorizontal className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Features
            </h1>
            <p className="text-sm text-muted-foreground">
              Enciende o apaga módulos por laboratorio. El portal productor está ON por defecto.
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
            <CardTitle className="text-base">Compañías</CardTitle>
            <CardDescription>
              {companies.length} compañía{companies.length === 1 ? '' : 's'}
            </CardDescription>
          </CardHeader>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Compañía</TableHead>
                  {FEATURE_FLAG_KEYS.map((key) => (
                    <TableHead key={key}>
                      <div className="flex flex-col gap-0.5">
                        <span>{FEATURE_FLAG_REGISTRY[key].label}</span>
                        {!FEATURE_FLAG_REGISTRY[key].enforced ? (
                          <span className="text-xs font-normal text-muted-foreground">
                            sin efecto aún
                          </span>
                        ) : null}
                      </div>
                    </TableHead>
                  ))}
                  <TableHead>Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {companies.map((row) => {
                  const draft = draftFlags[row.companyId] ?? row.flags
                  return (
                    <TableRow key={row.companyId}>
                      <TableCell className="font-medium text-foreground">
                        {row.companyName}
                      </TableCell>
                      {FEATURE_FLAG_KEYS.map((key) => (
                        <TableCell key={key}>
                          <label className="inline-flex items-center gap-2 text-sm text-foreground">
                            <input
                              type="checkbox"
                              checked={draft[key]}
                              onChange={(event) =>
                                updateDraftFlag(row.companyId, key, event.target.checked)
                              }
                              className="h-4 w-4 rounded border-gray-300 text-green-700 focus:ring-green-600"
                            />
                            {draft[key] ? 'On' : 'Off'}
                          </label>
                        </TableCell>
                      ))}
                      <TableCell>
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
                      </TableCell>
                    </TableRow>
                  )
                })}
                {companies.length === 0 ? (
                  <TableRow>
                    <TableCell
                      colSpan={FEATURE_FLAG_KEYS.length + 2}
                      className="py-8 text-center text-muted-foreground"
                    >
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
