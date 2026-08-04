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
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
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
      <div className="p-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900">Panel fitosanitario</h1>
          <p className="text-gray-600">
            Resumen operacional y de riesgo para tus muestras · Año {yearLabel}
          </p>
        </div>

        {clientTabs.length > 1 && (
          <div className="mb-6">
            <div className="border-b border-gray-200">
              <nav className="-mb-px flex space-x-4 overflow-x-auto">
                {clientTabs.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={`whitespace-nowrap border-b-2 px-1 pb-3 text-sm font-medium transition-colors ${
                      selectedClientId === client.id
                        ? 'border-green-600 text-green-700'
                        : 'border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700'
                    }`}
                  >
                    {client.name}
                  </button>
                ))}
              </nav>
            </div>
          </div>
        )}

        {linkedClientIds.length === 0 ? (
          <div className="rounded-lg border border-gray-200 bg-white p-12 text-center">
            <AlertTriangle className="mx-auto mb-4 h-12 w-12 text-gray-400" />
            <h3 className="mb-2 text-lg font-medium text-gray-900">No tienes clientes vinculados</h3>
            <p className="text-gray-500">Contacta a tu administrador para que te asigne clientes.</p>
          </div>
        ) : isLoading ? (
          <div className="flex min-h-[40vh] items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        ) : error ? (
          <div className="rounded-lg border border-red-200 bg-red-50 p-6 text-sm text-red-800">
            {error}
          </div>
        ) : (
          <>
            <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <KpiCard
                title="Muestras recepcionadas"
                value={String(kpis?.samplesReceived ?? 0)}
                icon={<TestTube className="h-5 w-5 text-green-600" />}
              />
              <KpiCard
                title="Informes emitidos"
                value={String(kpis?.reportsIssued ?? 0)}
                icon={<FileCheck2 className="h-5 w-5 text-indigo-600" />}
              />
              <KpiCard
                title="Cobertura por análisis"
                value={`${(kpis?.analysisCoverageRatio ?? 0).toFixed(2)}`}
                subtitle="análisis / muestra"
                icon={<Activity className="h-5 w-5 text-blue-600" />}
              />
              <KpiCard
                title="% crítico (tol. cero)"
                value={`${(kpis?.criticalRate ?? 0).toFixed(1)}%`}
                subtitle={
                  dashboard?.semaforo.hasNormalizedFindings
                    ? 'sobre detecciones normalizadas'
                    : 'sin marcas SAG aún'
                }
                icon={<AlertTriangle className="h-5 w-5 text-red-600" />}
              />
            </div>

            <div className="mb-6 grid grid-cols-1 gap-6 xl:grid-cols-2">
              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Distribución por disciplina</h2>
                <p className="mb-4 text-sm text-gray-500">Peso relativo de cada área de análisis</p>
                <DisciplineDonutChart data={dashboard?.byDiscipline || []} />
              </section>

              <section className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
                <h2 className="mb-1 text-lg font-semibold text-gray-900">Prevalencia por patógeno</h2>
                <p className="mb-4 text-sm text-gray-500">Top detecciones en el período</p>
                <PrevalenceBarChart data={dashboard?.prevalence || []} />
              </section>
            </div>

            <section className="mb-6 rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
              <h2 className="mb-1 text-lg font-semibold text-gray-900">Semáforo sanitario</h2>
              <p className="mb-4 text-sm text-gray-500">
                Crítico = tolerancia cero SAG marcada por el laboratorio. Sin umbrales UDE en esta versión.
              </p>
              <SemaforoDonutChart
                data={
                  dashboard?.semaforo || {
                    critico: 0,
                    controlado: 0,
                    hasNormalizedFindings: false,
                  }
                }
              />
            </section>

            <section>
              <div className="mb-3">
                <h2 className="text-lg font-semibold text-gray-900">Detecciones recientes</h2>
                <p className="text-sm text-gray-500">Últimas detecciones normalizadas del período</p>
              </div>
              <DetectionsTable
                rows={dashboard?.detections || []}
                hasNormalizedFindings={Boolean(dashboard?.semaforo.hasNormalizedFindings)}
                onOpenReport={(reportId) => setViewReportId(reportId)}
              />
            </section>
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
    <div className="rounded-lg border border-gray-200 bg-white p-5 shadow-sm">
      <div className="mb-3 flex items-center justify-between">
        <p className="text-sm font-medium text-gray-600">{title}</p>
        {icon}
      </div>
      <p className="text-3xl font-semibold text-gray-900">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-gray-500">{subtitle}</p> : null}
    </div>
  )
}
