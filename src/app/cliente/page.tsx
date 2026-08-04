'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import type { ReactNode } from 'react'
import {
  AlertTriangle,
  FileCheck2,
  Loader2,
  Activity,
  TestTube,
} from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import {
  DisciplineDonutChart,
  type DisciplineRow,
} from '@/components/cliente/DisciplineDonutChart'
import {
  PrevalenceBarChart,
  type PrevalenceRow,
} from '@/components/cliente/PrevalenceBarChart'
import {
  SemaforoDonutChart,
  type SemaforoData,
} from '@/components/cliente/SemaforoDonutChart'
import {
  DetectionsTable,
  type DetectionRow,
} from '@/components/cliente/DetectionsTable'
import ViewReportModal from '@/components/reports/ViewReportModal'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Skeleton } from '@/components/ui/skeleton'

type DashboardKpis = {
  samplesReceived: number
  reportsIssued: number
  analysisCoverageRatio: number
  criticalRate: number
}

type DashboardPayload = {
  period: { from: string; to: string }
  kpis: DashboardKpis
  byDiscipline: DisciplineRow[]
  prevalence: PrevalenceRow[]
  semaforo: SemaforoData
  detections: DetectionRow[]
}

export default function ClienteDashboardPage() {
  const router = useRouter()
  const { userRole, isLoading: authLoading, linkedClientIds, isAuthenticated } = useAuth()
  const supabase = getSupabaseClient()

  const [selectedClientId, setSelectedClientId] = useState<string | null>(null)
  const [clientTabs, setClientTabs] = useState<{ id: string; name: string }[]>([])
  const [dashboard, setDashboard] = useState<DashboardPayload | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [viewReportId, setViewReportId] = useState<string | null>(null)

  useEffect(() => {
    if (authLoading) return
    if (!isAuthenticated) {
      router.replace('/login')
      return
    }
    if (userRole && userRole !== 'consumidor') {
      router.replace('/dashboard')
    }
  }, [authLoading, isAuthenticated, userRole, router])

  useEffect(() => {
    if (linkedClientIds.length === 0) {
      setClientTabs([])
      setSelectedClientId(null)
      return
    }

    supabase
      .from('clients')
      .select('id, name')
      .in('id', linkedClientIds)
      .then(({ data }: { data: { id: string; name: string }[] | null }) => {
        if (data) {
          setClientTabs(data)
          if (!selectedClientId || !linkedClientIds.includes(selectedClientId)) {
            setSelectedClientId(data[0]?.id || null)
          }
        }
      })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [linkedClientIds.join(',')])

  const fetchDashboard = useCallback(async () => {
    if (!selectedClientId) {
      setDashboard(null)
      setIsLoading(false)
      return
    }

    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch(
        `/api/cliente/dashboard?client_id=${encodeURIComponent(selectedClientId)}`
      )
      if (!response.ok) {
        const payload = await response.json().catch(() => ({}))
        throw new Error(payload.error || 'No se pudo cargar el panel')
      }
      const payload = (await response.json()) as DashboardPayload
      setDashboard(payload)
    } catch (fetchError) {
      console.error('Error loading client dashboard:', fetchError)
      setError(fetchError instanceof Error ? fetchError.message : 'Error desconocido')
      setDashboard(null)
    } finally {
      setIsLoading(false)
    }
  }, [selectedClientId])

  useEffect(() => {
    if (authLoading || userRole !== 'consumidor') return
    if (linkedClientIds.length > 0 && !selectedClientId) return
    fetchDashboard()
  }, [authLoading, userRole, linkedClientIds.length, selectedClientId, fetchDashboard])

  if (authLoading || (userRole && userRole !== 'consumidor')) {
    return (
      <DashboardLayout>
        <div className="flex min-h-[40vh] items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const kpis = dashboard?.kpis
  const yearLabel = dashboard?.period?.from
    ? new Date(dashboard.period.from).getFullYear()
    : new Date().getFullYear()

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Panel fitosanitario
          </h1>
          <p className="text-sm text-muted-foreground">
            Resumen operacional y de riesgo para tus muestras · Año {yearLabel}
          </p>
        </div>

        {clientTabs.length > 1 && selectedClientId && (
          <Tabs value={selectedClientId} onValueChange={setSelectedClientId}>
            <TabsList variant="line" className="h-auto w-full justify-start overflow-x-auto">
              {clientTabs.map((client) => (
                <TabsTrigger key={client.id} value={client.id}>
                  {client.name}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        )}

        {linkedClientIds.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center py-12 text-center">
              <AlertTriangle className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No tienes clientes vinculados</CardTitle>
              <CardDescription>
                Contacta a tu administrador para que te asigne clientes.
              </CardDescription>
            </CardContent>
          </Card>
        ) : isLoading ? (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
            {Array.from({ length: 4 }).map((_, index) => (
              <Card key={index}>
                <CardHeader className="pb-2">
                  <Skeleton className="h-4 w-28" />
                </CardHeader>
                <CardContent>
                  <Skeleton className="h-8 w-16" />
                </CardContent>
              </Card>
            ))}
          </div>
        ) : error ? (
          <Card className="border-destructive/30 bg-destructive/5">
            <CardContent className="py-6 text-sm text-destructive">{error}</CardContent>
          </Card>
        ) : (
          <>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Muestras recepcionadas"
                value={String(kpis?.samplesReceived ?? 0)}
                icon={<TestTube className="h-5 w-5 text-primary" />}
              />
              <KpiCard
                title="Informes emitidos"
                value={String(kpis?.reportsIssued ?? 0)}
                icon={<FileCheck2 className="h-5 w-5 text-primary" />}
              />
              <KpiCard
                title="Cobertura por análisis"
                value={`${(kpis?.analysisCoverageRatio ?? 0).toFixed(2)}`}
                subtitle="análisis / muestra"
                icon={<Activity className="h-5 w-5 text-primary" />}
              />
              <KpiCard
                title="% crítico (tol. cero)"
                value={`${(kpis?.criticalRate ?? 0).toFixed(1)}%`}
                subtitle={
                  dashboard?.semaforo.hasNormalizedFindings
                    ? 'sobre detecciones normalizadas'
                    : 'sin marcas SAG aún'
                }
                icon={<AlertTriangle className="h-5 w-5 text-destructive" />}
              />
            </div>

            <div className="grid grid-cols-1 gap-6 xl:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>Distribución por disciplina</CardTitle>
                  <CardDescription>Peso relativo de cada área de análisis</CardDescription>
                </CardHeader>
                <CardContent>
                  <DisciplineDonutChart data={dashboard?.byDiscipline || []} />
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Prevalencia por patógeno</CardTitle>
                  <CardDescription>Top detecciones en el período</CardDescription>
                </CardHeader>
                <CardContent>
                  <PrevalenceBarChart data={dashboard?.prevalence || []} />
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Semáforo sanitario</CardTitle>
                <CardDescription>
                  Crítico = tolerancia cero SAG marcada por el laboratorio. Sin umbrales UDE en esta versión.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <SemaforoDonutChart
                  data={
                    dashboard?.semaforo || {
                      critico: 0,
                      controlado: 0,
                      hasNormalizedFindings: false,
                    }
                  }
                />
              </CardContent>
            </Card>

            <div className="space-y-3">
              <div>
                <h2 className="text-lg font-semibold text-foreground">Detecciones recientes</h2>
                <p className="text-sm text-muted-foreground">
                  Últimas detecciones normalizadas del período
                </p>
              </div>
              <DetectionsTable
                rows={dashboard?.detections || []}
                hasNormalizedFindings={Boolean(dashboard?.semaforo.hasNormalizedFindings)}
                onOpenReport={(reportId) => setViewReportId(reportId)}
              />
            </div>
          </>
        )}
      </div>

      {viewReportId && (
        <ViewReportModal
          reportId={viewReportId}
          isOpen={Boolean(viewReportId)}
          onClose={() => setViewReportId(null)}
        />
      )}
    </DashboardLayout>
  )
}

function KpiCard({
  title,
  value,
  subtitle,
  icon,
}: {
  title: string
  value: string
  subtitle?: string
  icon: ReactNode
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <p className="text-3xl font-semibold tracking-tight text-foreground">{value}</p>
        {subtitle ? <p className="mt-1 text-xs text-muted-foreground">{subtitle}</p> : null}
      </CardContent>
    </Card>
  )
}
