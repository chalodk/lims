'use client'

import { useAuth } from '@/hooks/useAuth'
import UserSetup from '@/components/auth/UserSetup'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { 
  FlaskConical, 
  Users, 
  FileText, 
  TrendingUp, 
  Clock, 
  CheckCircle, 
  AlertCircle,
  Loader2
} from 'lucide-react'

export default function DashboardPage() {
  const { isLoading } = useAuth()

  // Simple loading check
  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
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
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <div className="p-3 bg-blue-100 rounded-full">
                <FlaskConical className="h-6 w-6 text-blue-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Conectar a base de datos</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Pendientes</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <div className="p-3 bg-yellow-100 rounded-full">
                <Clock className="h-6 w-6 text-yellow-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <AlertCircle className="h-4 w-4 mr-1" />
                <span>Conectar a base de datos</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Completadas</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <div className="p-3 bg-green-100 rounded-full">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <TrendingUp className="h-4 w-4 mr-1" />
                <span>Conectar a base de datos</span>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-gray-600">Informes</p>
                <p className="text-3xl font-bold text-gray-900">-</p>
              </div>
              <div className="p-3 bg-purple-100 rounded-full">
                <FileText className="h-6 w-6 text-purple-600" />
              </div>
            </div>
            <div className="mt-4">
              <div className="flex items-center text-sm text-gray-500">
                <FileText className="h-4 w-4 mr-1" />
                <span>Conectar a base de datos</span>
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
              <div className="space-y-4">
                <div className="flex items-center justify-center py-8">
                  <div className="text-center">
                    <FlaskConical className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-sm text-gray-500">No hay muestras recientes</p>
                    <p className="text-xs text-gray-400 mt-1">Las muestras aparecerán aquí cuando se creen</p>
                  </div>
                </div>
              </div>
              <div className="mt-6">
                <button className="w-full text-center text-sm font-medium text-indigo-600 hover:text-indigo-500">
                  Ver todas las muestras →
                </button>
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
                <button className="flex flex-col items-center p-4 bg-indigo-50 rounded-lg hover:bg-indigo-100 transition-colors">
                  <FlaskConical className="h-8 w-8 text-indigo-600 mb-2" />
                  <span className="text-sm font-medium text-indigo-900">Nueva Muestra</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-green-50 rounded-lg hover:bg-green-100 transition-colors">
                  <FileText className="h-8 w-8 text-green-600 mb-2" />
                  <span className="text-sm font-medium text-green-900">Generar Informe</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-purple-50 rounded-lg hover:bg-purple-100 transition-colors">
                  <Users className="h-8 w-8 text-purple-600 mb-2" />
                  <span className="text-sm font-medium text-purple-900">Gestionar Clientes</span>
                </button>
                
                <button className="flex flex-col items-center p-4 bg-orange-50 rounded-lg hover:bg-orange-100 transition-colors">
                  <TrendingUp className="h-8 w-8 text-orange-600 mb-2" />
                  <span className="text-sm font-medium text-orange-900">Ver Estadísticas</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  )
}