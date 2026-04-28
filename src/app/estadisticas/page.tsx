'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import {
  TrendingUp,
  Users,
  TestTube,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react'
import {
  SamplesByMonthChart,
  type SamplesByMonthRow
} from '@/components/estadisticas/SamplesByMonthChart'
import {
  ResultsByTypeChart,
  type ResultsByTypeRow
} from '@/components/estadisticas/ResultsByTypeChart'

export default function EstadisticasPage() {
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
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = getSupabaseClient()

        const now = new Date()
        const completedDayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0)
        const completedDayEnd = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999)
        const statsQuery = new URLSearchParams({
          completedDayStart: completedDayStart.toISOString(),
          completedDayEnd: completedDayEnd.toISOString()
        })

        const [samplesResult, resultsResult, clientsResult, dashboardStatsResponse, chartsResponse] =
          await Promise.all([
            supabase.from('samples').select('id', { count: 'exact' }),
            supabase.from('results').select('id', { count: 'exact' }),
            supabase.from('clients').select('id', { count: 'exact' }),
            fetch(`/api/dashboard/stats?${statsQuery.toString()}`),
            fetch('/api/estadisticas/charts')
          ])

        let pendingWork = 0
        let completedTodayCount = 0
        if (dashboardStatsResponse.ok) {
          const dashboardStats = await dashboardStatsResponse.json()
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
          totalSamples: samplesResult.count || 0,
          totalResults: resultsResult.count || 0,
          totalClients: clientsResult.count || 0,
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
  }, [])

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Estadísticas</h1>
          <p className="text-gray-600">Resumen general del laboratorio</p>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-blue-100 rounded-lg">
                <TestTube className="h-6 w-6 text-blue-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Muestras</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalSamples}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Resultados</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalResults}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-purple-100 rounded-lg">
                <Users className="h-6 w-6 text-purple-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Clientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.totalClients}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-yellow-100 rounded-lg">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-2xl font-bold text-gray-900">{stats.pendingResults}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-green-100 rounded-lg">
                <Calendar className="h-6 w-6 text-green-600" />
              </div>
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Completados Hoy</p>
                <p className="text-2xl font-bold text-gray-900">{stats.completedToday}</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="flex items-center">
              <div className="p-2 bg-indigo-100 rounded-lg">
                <TrendingUp className="h-6 w-6 text-indigo-600" />
              </div>
              <div className="ml-4 min-w-0 flex-1">
                <p className="text-sm font-medium text-gray-600">Tiempo promedio</p>
                <p className="text-2xl font-bold text-gray-900">
                  {stats.averageLeadTimeResultCount === 0
                    ? '—'
                    : `${stats.averageProcessingTime?.toLocaleString('es', {
                        maximumFractionDigits: 1
                      })} h`}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  {stats.averageLeadTimeResultCount > 0
                    ? `Ingreso de muestra → validación del resultado · ${stats.averageLeadTimeResultCount} validado${
                        stats.averageLeadTimeResultCount === 1 ? '' : 's'
                      }`
                    : 'Solo resultados con validación e ingreso de muestra fechados'}
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Muestras por mes</h3>
              <p className="text-sm text-gray-500">Últimos 12 meses según fecha de registro</p>
            </div>
            <SamplesByMonthChart data={samplesByMonth} />
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <div className="mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Resultados por tipo de análisis</h3>
              <p className="text-sm text-gray-500">
                Cantidad de resultados según área / tipo de análisis registrado en cada resultado
              </p>
            </div>
            <ResultsByTypeChart data={resultsByType} />
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
