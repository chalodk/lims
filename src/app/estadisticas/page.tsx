'use client'

import { Suspense, useState, useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  TrendingUp,
  Users,
  TestTube,
  Calendar,
  Clock,
  CheckCircle,
  Mail
} from 'lucide-react'
import {
  SamplesByMonthChart,
  type SamplesByMonthRow
} from '@/components/estadisticas/SamplesByMonthChart'
import {
  ResultsByTypeChart,
  type ResultsByTypeRow
} from '@/components/estadisticas/ResultsByTypeChart'
import { DisciplineDetail } from '@/components/estadisticas/DisciplineDetail'
import {
  buildDisciplineDonutRows,
  resolveDiscipline,
  type DisciplineDashboard,
  type DisciplineMonths,
} from '@/lib/stats/disciplineDashboard'
import { resolveSpeciesFamily } from '@/lib/stats/speciesFamilies'
import PlanUsageCard from '@/components/billing/PlanUsageCard'
import { useCompanyBillingUsage } from '@/hooks/useCompanyBillingUsage'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'

function EstadisticasPageInner() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const selectedDiscipline = resolveDiscipline(searchParams.get('disciplina'))
  const selectedArea = selectedDiscipline?.area ?? null
  const selectedFamily = resolveSpeciesFamily(searchParams.get('familia'))
  const selectedFamilyKey = selectedFamily?.key ?? null
  const { role } = useAuth()
  const { usage: billingUsage, isLoading: billingLoading, error: billingError } =
    useCompanyBillingUsage()
  const [stats, setStats] = useState({
    totalSamples: 0,
    totalResults: 0,
    totalClients: 0,
    pendingResults: 0,
    completedToday: 0,
    averageProcessingTime: null as number | null,
    averageLeadTimeResultCount: 0
  })
  const [samplesByMonth, setSamplesByMonth] = useState<SamplesByMonthRow[]>([])
  const [resultsByType, setResultsByType] = useState<ResultsByTypeRow[]>([])
  const [isLoading, setIsLoading] = useState(!selectedArea)
  const [solicitarStatus, setSolicitarStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle')
  const [solicitarError, setSolicitarError] = useState('')
  const [months, setMonths] = useState<DisciplineMonths>(6)
  const [disciplineDashboard, setDisciplineDashboard] = useState<
    (DisciplineDashboard & { speciesFamily: string | null }) | null
  >(null)
  const [disciplineError, setDisciplineError] = useState<string | null>(null)

  useEffect(() => {
    const rawDiscipline = searchParams.get('disciplina')
    const rawFamily = searchParams.get('familia')
    const disciplineInvalid = Boolean(rawDiscipline && !resolveDiscipline(rawDiscipline))
    const familyInvalid = Boolean(rawFamily && !resolveSpeciesFamily(rawFamily))
    if (!disciplineInvalid && !familyInvalid) return
    if (disciplineInvalid) {
      router.replace('/estadisticas')
      return
    }
    const params = new URLSearchParams(searchParams.toString())
    params.delete('familia')
    const query = params.toString()
    router.replace(query ? `/estadisticas?${query}` : '/estadisticas')
  }, [router, searchParams])

  useEffect(() => {
    if (selectedArea) return

    const fetchStats = async () => {
      setIsLoading(true)
      try {
        const now = new Date()
        const completedDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const completedDayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        const statsQuery = new URLSearchParams({
          completedDayStart: completedDayStart.toISOString(),
          completedDayEnd: completedDayEnd.toISOString()
        })

        const [dashboardStatsResponse, chartsResponse] =
          await Promise.all([
            fetch(`/api/dashboard/stats?${statsQuery.toString()}`),
            fetch('/api/estadisticas/charts')
          ])

        let totalSamples = 0
        let totalResults = 0
        let totalClients = 0
        let pendingWork = 0
        let completedTodayCount = 0
        if (dashboardStatsResponse.ok) {
          const dashboardStats = await dashboardStatsResponse.json()
          totalSamples = dashboardStats?.samples?.total ?? 0
          totalResults = dashboardStats?.results?.total ?? 0
          totalClients = dashboardStats?.overview?.totalClients ?? 0
          pendingWork = dashboardStats?.overview?.pendingWork ?? 0
          completedTodayCount = dashboardStats?.overview?.completedToday ?? 0
        }

        let samplesByMonthData: SamplesByMonthRow[] = []
        let resultsByTypeData: ResultsByTypeRow[] = []
        let averageHours: number | null = null
        let averageLeadCount = 0

        if (chartsResponse.ok) {
          const chartsPayload = await chartsResponse.json()
          samplesByMonthData = Array.isArray(chartsPayload.samplesByMonth) ? chartsPayload.samplesByMonth : []
          resultsByTypeData = Array.isArray(chartsPayload.resultsByType) ? chartsPayload.resultsByType : []
          const rawAvg = chartsPayload.averageLeadTimeHours
          const rawCount = chartsPayload.averageLeadTimeResultCount
          if (typeof rawAvg === 'number' && !Number.isNaN(rawAvg)) {
            averageHours = rawAvg
          }
          if (typeof rawCount === 'number') {
            averageLeadCount = rawCount
          }
        }

        setSamplesByMonth(samplesByMonthData)
        setResultsByType(resultsByTypeData)
        setStats({
          totalSamples,
          totalResults,
          totalClients,
          pendingResults: pendingWork,
          completedToday: completedTodayCount,
          averageProcessingTime: averageHours,
          averageLeadTimeResultCount: averageLeadCount
        })
      } catch (error) {
        console.error('Error fetching statistics:', error)
      } finally {
        setIsLoading(false)
      }
    }

    fetchStats()
  }, [selectedArea])

  useEffect(() => {
    if (!selectedArea) {
      setDisciplineDashboard(null)
      setDisciplineError(null)
      return
    }

    let cancelled = false
    const controller = new AbortController()
    setDisciplineError(null)

    const loadDiscipline = async () => {
      try {
        const familyQuery = selectedFamilyKey ? `&familia=${encodeURIComponent(selectedFamilyKey)}` : ''
        const response = await fetch(
          `/api/estadisticas/disciplina?area=${encodeURIComponent(selectedArea)}&months=${months}${familyQuery}`,
          { signal: controller.signal }
        )
        const payload = await response.json().catch(() => ({}))
        if (!response.ok) {
          throw new Error(payload.error || 'No se pudo cargar la disciplina')
        }
        if (
          !Array.isArray(payload.prevalence) ||
          !Array.isArray(payload.monthly) ||
          (payload.speciesFamily !== null && typeof payload.speciesFamily !== 'string')
        ) {
          throw new Error('Respuesta inválida')
        }
        if (!cancelled) {
          setDisciplineDashboard({
            ...(payload as DisciplineDashboard),
            speciesFamily: payload.speciesFamily ?? null,
          })
        }
      } catch (error) {
        if (cancelled || (error instanceof DOMException && error.name === 'AbortError')) return
        if (!cancelled) {
          setDisciplineDashboard(null)
          setDisciplineError(error instanceof Error ? error.message : 'No se pudo cargar la disciplina')
        }
      }
    }

    loadDiscipline()
    return () => {
      cancelled = true
      controller.abort()
    }
  }, [selectedArea, months, selectedFamilyKey])

  const handleSolicitarDatos = async () => {
    setSolicitarStatus('loading')
    setSolicitarError('')
    try {
      const response = await fetch('/api/estadisticas/solicitar-datos', { method: 'POST' })
      if (response.ok) {
        setSolicitarStatus('success')
      } else {
        const body = await response.json().catch(() => ({ error: 'Error desconocido' }))
        setSolicitarError(body.error ?? 'Error desconocido')
        setSolicitarStatus('error')
      }
    } catch {
      setSolicitarError('No se pudo conectar con el servidor')
      setSolicitarStatus('error')
    }
  }

  if (!selectedDiscipline && isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  if (selectedDiscipline) {
    const dashboardMatchesSelection =
      disciplineDashboard?.area.typeKey === selectedDiscipline.area &&
      disciplineDashboard.monthly.length === months &&
      disciplineDashboard.speciesFamily === selectedFamilyKey

    const handleFamilyChange = (familyKey: string) => {
      const params = new URLSearchParams(searchParams.toString())
      if (familyKey) params.set('familia', familyKey)
      else params.delete('familia')
      const query = params.toString()
      router.replace(query ? `/estadisticas?${query}` : '/estadisticas')
    }

    return (
      <DashboardLayout>
        <DisciplineDetail
          disciplineLabel={selectedDiscipline.label}
          disciplineColor={selectedDiscipline.color}
          months={months}
          onMonthsChange={setMonths}
          familyKey={selectedFamilyKey ?? ''}
          onFamilyChange={handleFamilyChange}
          onBack={() => router.push('/estadisticas')}
          dashboard={dashboardMatchesSelection ? disciplineDashboard : null}
          isLoading={!disciplineError && !dashboardMatchesSelection}
          error={disciplineError}
        />
      </DashboardLayout>
    )
  }

  const disciplineRows = buildDisciplineDonutRows(resultsByType)

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Estadísticas</h1>
          <p className="text-gray-600">Resumen general del laboratorio</p>
        </div>

        <PlanUsageCard
          usage={billingUsage}
          isLoading={billingLoading}
          error={billingError}
        />

        {role?.id === 1 && (
          <div className="mb-6">
            <Button
              onClick={handleSolicitarDatos}
              disabled={solicitarStatus === 'loading'}
              className="gap-2"
            >
              <Mail className="h-4 w-4" />
              {solicitarStatus === 'loading' ? 'Enviando solicitud...' : 'Solicitar todos los datos'}
            </Button>
            {solicitarStatus === 'success' && (
              <p className="mt-2 text-sm text-green-600 font-medium">
                Solicitud enviada con éxito. Recibirás los datos por correo electrónico.
              </p>
            )}
            {solicitarStatus === 'error' && (
              <p className="mt-2 text-sm text-red-600 font-medium">
                {solicitarError}
              </p>
            )}
          </div>
        )}

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <TestTube className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Muestras</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalSamples}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Resultados</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalResults}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <Users className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-yellow-100 rounded-lg">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pendingResults}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <Calendar className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Completados Hoy</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center">
                <div className="p-2 bg-gray-100 rounded-lg">
                  <TrendingUp className="h-6 w-6 text-gray-600" />
                </div>
                <div className="ml-4 min-w-0 flex-1">
                  <p className="text-sm font-medium text-gray-600">
                    Tiempo promedio de validación (mes en curso)
                  </p>
                  <p className="text-2xl font-bold text-gray-900">
                    {stats.averageLeadTimeResultCount === 0
                      ? '—'
                      : `${stats.averageProcessingTime?.toLocaleString('es', {
                          maximumFractionDigits: 1
                        })} h`}
                  </p>
                  <p className="text-xs text-gray-500 mt-1">
                    {stats.averageLeadTimeResultCount > 0
                      ? `Muestras ingresadas este mes → validación · ${stats.averageLeadTimeResultCount} validado${
                          stats.averageLeadTimeResultCount === 1 ? '' : 's'
                        }`
                      : 'Sin muestras ingresadas este mes con validación fechada'}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Muestras por mes
              </CardTitle>
              <CardDescription>
                Últimos 12 meses según fecha de registro
              </CardDescription>
            </CardHeader>
            <CardContent>
              <SamplesByMonthChart data={samplesByMonth} />
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Resultados por tipo de análisis
              </CardTitle>
              <CardDescription>
                Cantidad de resultados según área / tipo de análisis registrado en cada resultado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ResultsByTypeChart
                data={disciplineRows}
                onSelect={(typeKey) => router.push(`/estadisticas?disciplina=${encodeURIComponent(typeKey)}`)}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

function EstadisticasPageFallback() {
  return (
    <DashboardLayout>
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
      </div>
    </DashboardLayout>
  )
}

export default function EstadisticasPage() {
  return (
    <Suspense fallback={<EstadisticasPageFallback />}>
      <EstadisticasPageInner />
    </Suspense>
  )
}
