'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  FlaskConical, 
  Users, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2,
  TestTube
} from 'lucide-react'
import Link from 'next/link'

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

export default function DashboardPage() {
  const { isLoading } = useAuth()
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentSamples, setRecentSamples] = useState<RecentSample[]>([])
  const [isLoadingStats, setIsLoadingStats] = useState(true)
  const [isLoadingSamples, setIsLoadingSamples] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // Fetch dashboard statistics
      const statsResponse = await fetch('/api/dashboard/stats')
      if (statsResponse.ok) {
        const statsData = await statsResponse.json()
        setStats(statsData)
      } else {
        console.error('Failed to fetch dashboard stats')
      }

      // Fetch recent samples
      const samplesResponse = await fetch('/api/dashboard/recent-samples?limit=5')
      if (samplesResponse.ok) {
        const samplesData = await samplesResponse.json()
        setRecentSamples(samplesData.samples || [])
      } else {
        console.error('Failed to fetch recent samples')
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
    } finally {
      setIsLoadingStats(false)
      setIsLoadingSamples(false)
    }
  }

  const getStatusColor = (status: string) => {
    const colors = {
      received: 'bg-blue-100 text-blue-800',
      processing: 'bg-yellow-100 text-yellow-800',
      microscopy: 'bg-orange-100 text-orange-800',
      isolation: 'bg-purple-100 text-purple-800',
      identification: 'bg-indigo-100 text-indigo-800',
      molecular_analysis: 'bg-pink-100 text-pink-800',
      validation: 'bg-amber-100 text-amber-800',
      completed: 'bg-green-100 text-green-800'
    }
    return colors[status as keyof typeof colors] || 'bg-gray-100 text-gray-800'
  }

  // Simple loading check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Bienvenido al Dashboard
          </h2>
          <p className="text-gray-600">
            Gestiona tus muestras, resultados e informes desde aquí
          </p>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Muestras Activas</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  ) : (
                    stats?.overview.activeSamples || 0
                  )}
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
                  {isLoadingStats ? 'Cargando...' : 
                   stats ? `${stats.samples.processing} en proceso` : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  ) : (
                    stats?.overview.pendingWork || 0
                  )}
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
                  {isLoadingStats ? 'Cargando...' : 
                   stats ? `${stats.results.pending} resultados pendientes` : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  ) : (
                    stats?.overview.completedWork || 0
                  )}
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
                  {isLoadingStats ? 'Cargando...' : 
                   stats ? `${stats.results.validated} validadas` : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Informes</p>
                <p className="text-3xl font-bold text-gray-900">
                  {isLoadingStats ? (
                    <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
                  ) : (
                    stats?.overview.totalReports || 0
                  )}
                </p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <FileText className="h-4 w-4 mr-1" />
                <span>
                  {isLoadingStats ? 'Cargando...' : 
                   stats ? `${stats.reports.sent} enviados` : 'Sin datos'}
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Samples */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Muestras Recientes</h3>
            </div>
            <div className="p-6">
              {isLoadingSamples ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                  <span className="ml-2 text-gray-600">Cargando muestras...</span>
                </div>
              ) : recentSamples.length > 0 ? (
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
                        <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(sample.status)}`}>
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
                <Link 
                  href="/samples" 
                  className="block w-full text-center text-sm font-medium text-green-600 hover:text-green-500 transition-colors"
                >
                  Ver todas las muestras →
                </Link>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">Acciones Rápidas</h3>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-2 gap-4">
                            <Link href="/samples" className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <FlaskConical className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Nueva Muestra</span>
                </Link>
                
                <Link href="/reports" className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Generar Informe</span>
                </Link>
                
                <Link href="/clients" className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Gestionar Clientes</span>
                </Link>
                
                <Link href="/results" className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <TrendingUp className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900">Ver Resultados</span>
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}