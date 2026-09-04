'use client'

import { useCallback, useEffect, useMemo, useState, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  SamplesByMonthChart,
  type SamplesByMonthRow,
} from '@/components/estadisticas/SamplesByMonthChart'
import {
  ResultsByTypeChart,
  type ResultsByTypeRow,
} from '@/components/estadisticas/ResultsByTypeChart'
import { fieldClassName } from '@/components/ui/form-field-styles'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  type CompanyPlatformStats,
  monthOverMonthPercent,
} from '@/lib/stats/platformUsage'
import { FileText, Loader2, TestTube, Users, Activity } from 'lucide-react'

type CompanyOption = { id: string; name: string }

function formatDelta(current: number, previous: number): string {
  const percent = monthOverMonthPercent(current, previous)
  if (percent === null) {
    return 'sin base el mes anterior'
  }
  if (percent === 0) {
    return 'igual que el mes anterior'
  }
  const sign = percent > 0 ? '+' : ''
  return `${sign}${percent}% vs mes anterior`
}

function StatCard({
  title,
  value,
  hint,
  icon: Icon,
}: {
  title: string
  value: number
  hint?: string
  icon: typeof TestTube
}) {
  return (
    <Card>
      <CardContent className="pt-5">
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <Icon className="h-5 w-5 text-green-700" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-muted-foreground">{title}</p>
            <p className="text-2xl font-semibold tabular-nums text-foreground">{value}</p>
            {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

function AdminUsoPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()
  const [companies, setCompanies] = useState<CompanyOption[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>(
    searchParams.get('company_id') || ''
  )
  const [stats, setStats] = useState<CompanyPlatformStats | null>(null)
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(true)
  const [isLoadingStats, setIsLoadingStats] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (userRole !== 'csx') {
      router.replace('/dashboard')
    }
  }, [authLoading, isAuthenticated, userRole, router])

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    setError(null)
    try {
      const response = await fetch('/api/admin/companies')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar laboratorios')
      }
      const rows = (data.companies || []) as CompanyOption[]
      setCompanies(rows)
      setSelectedCompanyId((current) => {
        if (current && rows.some((row) => row.id === current)) return current
        return rows[0]?.id || ''
      })
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al cargar laboratorios')
      setCompanies([])
    } finally {
      setIsLoadingCompanies(false)
    }
  }, [])

  useEffect(() => {
    if (authLoading || !isAuthenticated || userRole !== 'csx') return
    void fetchCompanies()
  }, [authLoading, isAuthenticated, userRole, fetchCompanies])

  useEffect(() => {
    if (!selectedCompanyId) return
    if (searchParams.get('company_id') === selectedCompanyId) return
    router.replace(`/admin/uso?company_id=${encodeURIComponent(selectedCompanyId)}`)
  }, [selectedCompanyId, router, searchParams])

  useEffect(() => {
    if (!selectedCompanyId) {
      setStats(null)
      return
    }

    let cancelled = false
    setIsLoadingStats(true)
    setError(null)
    fetch(`/api/admin/stats?company_id=${encodeURIComponent(selectedCompanyId)}`)
      .then(async (response) => {
        const data = await response.json()
        if (!response.ok) {
          const detail = typeof data.details === 'string' ? data.details : ''
          throw new Error(
            detail ? `${data.error || 'Error al cargar estadísticas'}: ${detail}` : data.error || 'Error al cargar estadísticas'
          )
        }
        if (!cancelled) setStats(data as CompanyPlatformStats)
      })
      .catch((err: unknown) => {
        if (!cancelled) {
          setStats(null)
          setError(err instanceof Error ? err.message : 'Error al cargar estadísticas')
        }
      })
      .finally(() => {
        if (!cancelled) setIsLoadingStats(false)
      })

    return () => {
      cancelled = true
    }
  }, [selectedCompanyId])

  const sampleChartData: SamplesByMonthRow[] = useMemo(
    () => (stats?.samples.byMonth || []).map(({ monthKey, label, count }) => ({ monthKey, label, count })),
    [stats]
  )
  const reportChartData: SamplesByMonthRow[] = useMemo(
    () => (stats?.reports.byMonth || []).map(({ monthKey, label, count }) => ({ monthKey, label, count })),
    [stats]
  )
  const sampleTypeChartData: ResultsByTypeRow[] = useMemo(
    () => (stats?.samples.byType || []).map(({ key, label, count }) => ({ typeKey: key, label, count })),
    [stats]
  )
  const reportTypeChartData: ResultsByTypeRow[] = useMemo(
    () => (stats?.reports.byType || []).map(({ key, label, count }) => ({ typeKey: key, label, count })),
    [stats]
  )

  if (authLoading || isLoadingCompanies) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <Activity className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Uso</h1>
              <p className="text-sm text-muted-foreground">
                Muestras e informes por laboratorio. Útil para seguimiento CSX.
              </p>
            </div>
          </div>
          <label className="flex w-full max-w-sm flex-col gap-1.5 text-sm font-medium text-foreground">
            Laboratorio
            <select
              className={fieldClassName}
              value={selectedCompanyId}
              onChange={(event) => setSelectedCompanyId(event.target.value)}
            >
              {companies.length === 0 ? (
                <option value="">No hay laboratorios</option>
              ) : (
                companies.map((company) => (
                  <option key={company.id} value={company.id}>
                    {company.name}
                  </option>
                ))
              )}
            </select>
          </label>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        {isLoadingStats ? (
          <div className="flex h-48 items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : stats ? (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                title="Muestras este mes"
                value={stats.samples.thisMonth}
                hint={formatDelta(stats.samples.thisMonth, stats.samples.lastMonth)}
                icon={TestTube}
              />
              <StatCard
                title="Informes este mes"
                value={stats.reports.thisMonth}
                hint={formatDelta(stats.reports.thisMonth, stats.reports.lastMonth)}
                icon={FileText}
              />
              <StatCard
                title="Informes completados (mes)"
                value={stats.reports.completedThisMonth}
                hint={`${stats.reports.completedTotal} validados en total`}
                icon={FileText}
              />
              <StatCard
                title="Clientes"
                value={stats.clients.total}
                hint={`${stats.samples.active} muestras activas`}
                icon={Users}
              />
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Pipeline de muestras</CardTitle>
                  <CardDescription>
                    {stats.samples.total} muestras en total
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {stats.samples.byStatus.map((row) => (
                      <li key={row.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium tabular-nums text-foreground">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Estados de informes</CardTitle>
                  <CardDescription>
                    {stats.reports.total} informes en total
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ul className="space-y-2">
                    {stats.reports.byStatus.map((row) => (
                      <li key={row.key} className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">{row.label}</span>
                        <span className="font-medium tabular-nums text-foreground">{row.count}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Muestras por mes</CardTitle>
                  <CardDescription>Últimos {sampleChartData.length} meses</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <SamplesByMonthChart
                    data={sampleChartData}
                    emptyMessage="No hay muestras en los últimos seis meses."
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Informes por mes</CardTitle>
                  <CardDescription>Últimos {reportChartData.length} meses</CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <SamplesByMonthChart
                    data={reportChartData}
                    valueLabel="Informes"
                    barColor="#2563eb"
                    emptyMessage="No hay informes en los últimos seis meses."
                  />
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Muestras por tipo</CardTitle>
                  <CardDescription>
                    Área del catálogo de ensayos. Una muestra con más de un área cuenta en cada porción.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResultsByTypeChart
                    data={sampleTypeChartData}
                    emptyMessage="No hay muestras agrupadas por tipo."
                  />
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="border-b border-gray-100 py-3">
                  <CardTitle className="text-base">Informes por tipo</CardTitle>
                  <CardDescription>
                    Áreas del informe. Un informe con más de un área cuenta en cada porción.
                  </CardDescription>
                </CardHeader>
                <CardContent className="pt-4">
                  <ResultsByTypeChart
                    data={reportTypeChartData}
                    emptyMessage="No hay informes agrupados por tipo."
                  />
                </CardContent>
              </Card>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

function UsoPageFallback() {
  return (
    <DashboardLayout>
      <div className="flex h-64 items-center justify-center p-6">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    </DashboardLayout>
  )
}

export default function AdminUsoPage() {
  return (
    <Suspense fallback={<UsoPageFallback />}>
      <AdminUsoPageInner />
    </Suspense>
  )
}
