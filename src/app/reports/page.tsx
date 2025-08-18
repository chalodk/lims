'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Report } from '@/types/database'
import { 
  FileText,
  Download,
  Send,
  Search,
  Filter,
  TestTube,
  Loader2,
  Eye,
  Edit
} from 'lucide-react'

export default function ReportsPage() {
  const { user, userRole } = useAuth()
  const [reports, setReports] = useState<Report[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  
  const supabase = createClient()

  useEffect(() => {
    fetchReports()
  }, [])

  const fetchReports = async () => {
    try {
      let query = supabase
        .from('reports')
        .select(`
          *,
          samples (code, species, clients (name)),
          clients (name),
          users!generated_by (name, email),
          responsible:users!responsible_id (name, email)
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) throw error
      setReports(data || [])
    } catch (error) {
      console.error('Error fetching reports:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const filteredReports = reports.filter(report => {
    // Simple filtering since we don't have joins - can be improved later
    return searchTerm === '' || true
  })

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: 'bg-gray-100 text-gray-800 border-gray-200',
      generated: 'bg-blue-100 text-blue-800 border-blue-200',
      sent: 'bg-green-100 text-green-800 border-green-200'
    }

    const statusLabels = {
      draft: 'Borrador',
      generated: 'Generado',
      sent: 'Enviado'
    }

    return (
      <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
        statusConfig[status as keyof typeof statusConfig] || 'bg-gray-100 text-gray-800 border-gray-200'
      }`}>
        {statusLabels[status as keyof typeof statusLabels] || status}
      </span>
    )
  }

  const getTemplateBadge = (template: string | null) => {
    if (!template) return null

    const templateConfig = {
      standard: 'bg-blue-100 text-blue-800',
      regulatory: 'bg-purple-100 text-purple-800',
      summary: 'bg-green-100 text-green-800',
      detailed: 'bg-orange-100 text-orange-800'
    }

    const templateLabels = {
      standard: 'Estándar',
      regulatory: 'Regulatorio',
      summary: 'Resumen',
      detailed: 'Detallado'
    }

    return (
      <span className={`inline-flex items-center px-2 py-1 rounded text-xs font-medium ${
        templateConfig[template as keyof typeof templateConfig] || 'bg-gray-100 text-gray-800'
      }`}>
        {templateLabels[template as keyof typeof templateLabels] || template}
      </span>
    )
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="p-6">
        {/* Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Informes</h1>
              <p className="text-gray-600">Gestiona y genera informes de análisis</p>
            </div>
            {(userRole === 'admin' || userRole === 'validador') && (
              <div className="flex space-x-3">
                <button className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg flex items-center space-x-2 hover:bg-gray-50 transition-colors">
                  <Filter className="h-4 w-4" />
                  <span>Filtros</span>
                </button>
                <button className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors">
                  <FileText className="h-4 w-4" />
                  <span>Generar informe</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Buscar por código de muestra, especie o cliente..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
                />
              </div>
            </div>

            {/* Status Filter */}
            <div className="sm:w-48">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
              >
                <option value="all">Todos los estados</option>
                <option value="draft">Borradores</option>
                <option value="generated">Generados</option>
                <option value="sent">Enviados</option>
              </select>
            </div>
          </div>
        </div>

        {/* Reports List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredReports.length === 0 ? (
            <div className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay informes</h3>
              <p className="text-gray-500">Los informes aparecerán aquí una vez generados</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Muestra
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Plantilla
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Generado por
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Fecha
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredReports.map((report) => (
                    <tr key={report.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          <TestTube className="h-4 w-4 text-gray-400 mr-2" />
                          <div>
                            <div className="font-medium text-gray-900">Muestra: {report.sample_id?.split('-').slice(-1)[0] || 'N/A'}</div>
                            <div className="text-sm text-gray-500">ID: {report.sample_id || 'N/A'}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-medium text-gray-900">Cliente: {report.client_id?.split('-').slice(-1)[0] || 'N/A'}</div>
                      </td>
                      <td className="px-6 py-4">
                        {getTemplateBadge(report.template)}
                      </td>
                      <td className="px-6 py-4">
                        {getStatusBadge(report.status)}
                      </td>
                      <td className="px-6 py-4">
                        {report.generated_by ? (
                          <div className="flex items-center">
                            <div className="w-6 h-6 bg-indigo-100 rounded-full flex items-center justify-center mr-2">
                              <span className="text-indigo-600 font-medium text-xs">
                                U
                              </span>
                            </div>
                            <span className="text-sm text-gray-900">{report.generated_by.split('-').slice(-1)[0]}</span>
                          </div>
                        ) : (
                          <span className="text-sm text-gray-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {new Date(report.created_at).toLocaleDateString('es-ES')}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          <button className="p-1 text-gray-400 hover:text-indigo-600 transition-colors" title="Ver">
                            <Eye className="h-4 w-4" />
                          </button>
                          {report.download_url && (
                            <button className="p-1 text-gray-400 hover:text-green-600 transition-colors" title="Descargar">
                              <Download className="h-4 w-4" />
                            </button>
                          )}
                          {(userRole === 'admin' || userRole === 'validador') && report.status !== 'sent' && (
                            <>
                              <button className="p-1 text-gray-400 hover:text-blue-600 transition-colors" title="Editar">
                                <Edit className="h-4 w-4" />
                              </button>
                              <button className="p-1 text-gray-400 hover:text-purple-600 transition-colors" title="Enviar">
                                <Send className="h-4 w-4" />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  )
}