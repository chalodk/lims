'use client'

import { useState, useEffect } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  TestTube,
  Calendar,
  Clock,
  CheckCircle
} from 'lucide-react'

export default function EstadisticasPage() {
  const [stats, setStats] = useState({
    totalSamples: 0,
    totalResults: 0,
    totalClients: 0,
    pendingResults: 0,
    completedToday: 0,
    averageProcessingTime: 0
  })
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const fetchStats = async () => {
      try {
        const supabase = getSupabaseClient()
        
        // Fetch basic statistics
        const [samplesResult, resultsResult, clientsResult] = await Promise.all([
          supabase.from('samples').select('id', { count: 'exact' }),
          supabase.from('results').select('id', { count: 'exact' }),
          supabase.from('clients').select('id', { count: 'exact' })
        ])

        setStats({
          totalSamples: samplesResult.count || 0,
          totalResults: resultsResult.count || 0,
          totalClients: clientsResult.count || 0,
          pendingResults: 0, // TODO: Calculate pending results
          completedToday: 0, // TODO: Calculate completed today
          averageProcessingTime: 0 // TODO: Calculate average processing time
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
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Tiempo Promedio</p>
                <p className="text-2xl font-bold text-gray-900">{stats.averageProcessingTime}h</p>
              </div>
            </div>
          </div>
        </div>

        {/* Charts Section */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Muestras por Mes</h3>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Gráfico de muestras por mes</p>
                <p className="text-sm">(Próximamente)</p>
              </div>
            </div>
          </div>

          <div className="bg-white p-6 rounded-lg shadow-sm border">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Resultados por Tipo</h3>
            <div className="flex items-center justify-center h-64 text-gray-500">
              <div className="text-center">
                <BarChart3 className="h-12 w-12 mx-auto mb-2" />
                <p>Gráfico de resultados por tipo</p>
                <p className="text-sm">(Próximamente)</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}
