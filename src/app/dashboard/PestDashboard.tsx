'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import {
  AlertCircle,
  CheckCircle,
  Clock,
  FileText,
  FlaskConical,
  Loader2,
  TestTube,
  TrendingUp,
  Users,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

interface DashboardStats {
  samples: {
    total: number
    received: number
    processing: number
    validation: number
    completed: number
  }
  results: {
    total: number
    pending: number
    completed: number
    validated: number
  }
  reports: {
    total: number
    draft: number
    generated: number
    sent: number
  }
  overview: {
    activeSamples: number
    pendingWork: number
    completedWork: number
    completedToday?: number
    totalReports: number
  }
}

interface RecentSample {
  id: string
  code: string
  species: string
  variety?: string
  status: string
  received_date: string
  created_at: string
  daysAgo: number
  statusLabel: string
  testAreas: string[]
  clients?: { id: string; name: string }
  projects?: { id: string; name: string }
}

function statusColor(status: string) {
  const colors = {
    received: 'bg-blue-100 text-blue-800',
    processing: 'bg-yellow-100 text-yellow-800',
    microscopy: 'bg-orange-100 text-orange-800',
    isolation: 'bg-gray-100 text-gray-800',
    identification: 'bg-emerald-100 text-emerald-800',
    molecular_analysis: 'bg-green-100 text-green-800',
    validation: 'bg-amber-100 text-amber-800',
    completed: 'bg-green-100 text-green-800',
  }
  return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
}

export default function PestDashboard({ companyId }: { companyId?: string }) {
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSamples, setRecentSamples] = useState<RecentSample[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingSamples, setIsLoadingSamples] = useState(true)

  const fetchDashboardData = useCallback(async () => {
    const statsParams = new URLSearchParams()
    const samplesParams = new URLSearchParams({ limit: '5' })
    if (companyId) {
      statsParams.set('companyId', companyId)
      samplesParams.set('companyId', companyId)
    }
    const statsQuery = statsParams.toString()
    try {
      const statsResponse = await fetch(statsQuery ? `/api/dashboard/stats?${statsQuery}` : '/api/dashboard/stats')
      if (statsResponse.ok) {
        setStats(await statsResponse.json())
      } else {
        console.error('Failed to fetch dashboard stats')
        setStats(null)
      }

      const samplesResponse = await fetch(`/api/dashboard/recent-samples?${samplesParams.toString()}`)
      if (samplesResponse.ok) {
        const samplesData = await samplesResponse.json()
        setRecentSamples(samplesData.samples || [])
      } else {
        console.error('Failed to fetch recent samples')
        setRecentSamples([])
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      setStats(null)
      setRecentSamples([])
    } finally {
      setIsLoadingStats(false)
      setIsLoadingSamples(false)
    }
  }, [companyId])

  useEffect(() => {
    setIsLoadingStats(true)
    setIsLoadingSamples(true)
    void fetchDashboardData()

    const timeoutId = setTimeout(() => {
      setIsLoadingStats(false)
      setIsLoadingSamples(false)
    }, 10000)

    return () => clearTimeout(timeoutId)
  }, [fetchDashboardData])

  return (
    <>
      {(isLoadingStats || isLoadingSamples) ? (
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
          </div>
        </div>
      ) : (
      <div className="p-6">
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido al Dashboard
          </h2>
          <p className="text-gray-600">
            Gestiona tus muestras, resultados e informes desde aquí
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Muestras Activas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.overview.activeSamples || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <FlaskConical className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>
                    {stats ? `${stats.samples.processing} en proceso` : 'Sin datos'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Pendientes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.overview.pendingWork || 0}
                  </p>
                </div>
                <div className="p-3 bg-yellow-100 rounded-full">
                  <Clock className="h-6 w-6 text-yellow-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <AlertCircle className="h-4 w-4 mr-1" />
                  <span>
                    {stats ? `${stats.results.pending} resultados pendientes` : 'Sin datos'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Completadas</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.overview.completedWork || 0}
                  </p>
                </div>
                <div className="p-3 bg-green-100 rounded-full">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <TrendingUp className="h-4 w-4 mr-1" />
                  <span>
                    {stats ? `${stats.results.validated} validadas` : 'Sin datos'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600">Informes</p>
                  <p className="text-3xl font-bold text-gray-900">
                    {stats?.overview.totalReports || 0}
                  </p>
                </div>
                <div className="p-3 bg-gray-100 rounded-full">
                  <FileText className="h-6 w-6 text-gray-600" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-center text-sm text-gray-500">
                  <FileText className="h-4 w-4 mr-1" />
                  <span>
                    {stats ? `${stats.reports.sent} enviados` : 'Sin datos'}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Muestras Recientes
              </CardTitle>
              <CardDescription>
                Últimas muestras registradas en el laboratorio
              </CardDescription>
            </CardHeader>
            <CardContent>
              {recentSamples.length > 0 ? (
                <div className="space-y-4">
                  {recentSamples.map((sample) => (
                    <div key={sample.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors">
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-green-100 rounded-full">
                          <TestTube className="h-4 w-4 text-green-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900">{sample.code}</p>
                          <p className="text-xs text-gray-500">
                            {sample.species} {sample.variety && `- ${sample.variety}`}
                          </p>
                          {sample.clients && (
                            <p className="text-xs text-gray-400">{sample.clients.name}</p>
                          )}
                        </div>
                      </div>
                      <div className="text-right">
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${statusColor(sample.status)}`}>
                          {sample.statusLabel}
                        </span>
                        <p className="text-xs text-gray-400 mt-1">
                          {sample.daysAgo === 0 ? 'Hoy' :
                           sample.daysAgo === 1 ? 'Ayer' :
                           `Hace ${sample.daysAgo} días`}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No hay muestras recientes</p>
                    <p className="text-xs text-gray-400 mt-1">Las muestras aparecerán aquí cuando se creen</p>
                  </div>
                </div>
              )}
              <div className="mt-6">
                <Button variant="link" asChild className="w-full">
                  <Link href="/samples">Ver todas las muestras →</Link>
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-gray-200 shadow-sm">
            <CardHeader>
              <CardTitle className="text-lg font-semibold text-gray-900">
                Acciones Rápidas
              </CardTitle>
              <CardDescription>
                Atajos a las tareas más comunes
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 gap-4">
                <Button asChild className="h-auto flex-col gap-2 py-4">
                  <Link href="/samples">
                    <FlaskConical className="h-8 w-8" />
                    <span>Nueva Muestra</span>
                  </Link>
                </Button>

                <Button asChild className="h-auto flex-col gap-2 py-4">
                  <Link href="/reports">
                    <FileText className="h-8 w-8" />
                    <span>Generar Informe</span>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto flex-col gap-2 py-4">
                  <Link href="/clients">
                    <Users className="h-8 w-8" />
                    <span>Gestionar Clientes</span>
                  </Link>
                </Button>

                <Button variant="outline" asChild className="h-auto flex-col gap-2 py-4">
                  <Link href="/results">
                    <TrendingUp className="h-8 w-8" />
                    <span>Ver Resultados</span>
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
      )}
    </>
  )
}
