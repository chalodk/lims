'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import ViewResultModal from '@/components/results/ViewResultModal'
import AddResultModal from '@/components/results/AddResultModal'
import { ResultWithRelations } from '@/types/database'
import { formatDate } from '@/lib/utils/formatters'
import { getResultStatusBadge, getResultTypeBadge, getSeverityBadge } from '@/lib/utils/badges'
import { 
  Plus,
  Search,
  FlaskConical,
  Loader2,
  Eye,
  Edit2,
  Filter
} from 'lucide-react'

export default function ResultsPage() {
  const { userRole } = useAuth()
  const [results, setResults] = useState<ResultWithRelations[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [testAreaFilter, setTestAreaFilter] = useState<string>('all')
  const [selectedResultId, setSelectedResultId] = useState<string | null>(null)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [editingResultId, setEditingResultId] = useState<string | null>(null)

  const fetchResults = useCallback(async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/results')
      if (!response.ok) throw new Error('Failed to fetch results')
      
      const data = await response.json()
      // Handle both formats: {data: [...]} or direct array
      const resultsArray = Array.isArray(data) ? data : (data.data || [])
      setResults(resultsArray)
    } catch (error) {
      console.error('Error fetching results:', error)
      setResults([])
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchResults()
  }, [fetchResults])

  const filteredResults = results.filter(result => {
    const matchesSearch = 
      result.samples?.code?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.pathogen_identified?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      result.diagnosis?.toLowerCase().includes(searchTerm.toLowerCase())

    const matchesStatus = statusFilter === 'all' || result.status === statusFilter
    const matchesTestArea = testAreaFilter === 'all' || result.test_area === testAreaFilter

    return matchesSearch && matchesStatus && matchesTestArea
  })

  // Badge functions moved to shared utilities

  const canCreateResults = userRole && ['admin', 'validador', 'comun'].includes(userRole)
  const canEditResults = userRole && ['admin', 'validador'].includes(userRole)

  const testAreas = [
    { value: 'nematologia', label: 'Nematología' },
    { value: 'fitopatologia', label: 'Fitopatología' },
    { value: 'virologia', label: 'Virología' },
    { value: 'deteccion_precoz', label: 'Detección Precoz' }
  ]

  return (
    <DashboardLayout>
      <div className="p-6">
        <div className="sm:flex sm:items-center sm:justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Resultados</h1>
            <p className="mt-2 text-sm text-gray-700">
              Gestión de resultados de análisis de laboratorio
            </p>
          </div>
          {canCreateResults && (
            <div className="mt-4 sm:mt-0">
              <button
                onClick={() => setShowCreateModal(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
              >
                <Plus className="h-4 w-4 mr-2" />
                Nuevo Resultado
              </button>
            </div>
          )}
        </div>

        {/* Filters and Search */}
        <div className="bg-white rounded-lg shadow p-6 mb-6">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Buscar por muestra, patógeno o diagnóstico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              />
            </div>

            {/* Status Filter */}
            <div>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Todos los estados</option>
                <option value="pending">Pendiente</option>
                <option value="completed">Completado</option>
                <option value="validated">Validado</option>
              </select>
            </div>

            {/* Test Area Filter */}
            <div>
              <select
                value={testAreaFilter}
                onChange={(e) => setTestAreaFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="all">Todas las áreas</option>
                {testAreas.map(area => (
                  <option key={area.value} value={area.value}>{area.label}</option>
                ))}
              </select>
            </div>

            {/* Results count */}
            <div className="flex items-center text-sm text-gray-600">
              <Filter className="h-4 w-4 mr-2" />
              {filteredResults.length} resultado{filteredResults.length !== 1 ? 's' : ''}
            </div>
          </div>
        </div>

        {/* Results List */}
        {isLoading ? (
          <div className="flex justify-center items-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            <span className="ml-2 text-gray-600">Cargando resultados...</span>
          </div>
        ) : filteredResults.length === 0 ? (
          <div className="text-center py-12">
            <FlaskConical className="mx-auto h-12 w-12 text-gray-400" />
            <h3 className="mt-2 text-sm font-medium text-gray-900">Sin resultados</h3>
            <p className="mt-1 text-sm text-gray-500">
              {searchTerm || statusFilter !== 'all' || testAreaFilter !== 'all'
                ? 'No se encontraron resultados que coincidan con los filtros.'
                : 'Aún no hay resultados registrados.'}
            </p>
            {canCreateResults && !searchTerm && statusFilter === 'all' && testAreaFilter === 'all' && (
              <div className="mt-6">
                <button
                  onClick={() => setShowCreateModal(true)}
                  className="inline-flex items-center px-4 py-2 border border-transparent shadow-sm text-sm font-medium rounded-md text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500"
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Crear primer resultado
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-white shadow rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full table-auto">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[150px]">
                      Muestra
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Área de Análisis
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:table-cell">
                      Estado
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell">
                      Resultado
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider min-w-[120px]">
                      Patógeno
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:table-cell whitespace-nowrap">
                      Fecha
                    </th>
                    <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider w-32 sticky right-0 bg-gray-50 z-10">
                      Acciones
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {filteredResults.map((result) => (
                    <tr key={result.id} className="group hover:bg-gray-50">
                      <td className="px-3 py-4">
                        <div className="flex items-center min-w-0">
                          <FlaskConical className="h-6 w-6 text-green-600 mr-2 flex-shrink-0" />
                          <div className="min-w-0">
                            <div className="text-sm font-medium text-gray-900 truncate">
                              {result.samples?.code || 'N/A'}
                            </div>
                            <div className="text-xs text-gray-500 truncate">
                              {result.samples?.clients?.name || 'Cliente no disponible'}
                            </div>
                          </div>
                        </div>
                      </td>
                      <td className="px-3 py-4">
                        <span className="capitalize text-sm text-gray-900">
                          {result.test_area?.replace('_', ' ') || 'N/A'}
                        </span>
                      </td>
                      <td className="px-3 py-4 hidden md:table-cell">
                        {getResultStatusBadge(result.status)}
                      </td>
                      <td className="px-3 py-4 hidden lg:table-cell">
                        {getResultTypeBadge(result.result_type)}
                      </td>
                      <td className="px-3 py-4">
                        <div className="text-sm text-gray-900 truncate min-w-0">
                          {result.pathogen_identified || 'No identificado'}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-sm text-gray-500 hidden lg:table-cell whitespace-nowrap">
                        {formatDate(result.performed_at)}
                      </td>
                      <td className="px-3 py-4 sticky right-0 bg-white z-10 group-hover:bg-gray-50">
                        <div className="flex items-center space-x-1">
                          <button
                            onClick={() => {
                              setSelectedResultId(result.id)
                              setShowViewModal(true)
                            }}
                            className="text-green-600 hover:text-green-900"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {canEditResults && (
                            <button
                              onClick={() => {
                                setEditingResultId(result.id)
                                setShowCreateModal(true)
                              }}
                              className="text-blue-600 hover:text-blue-900"
                              title="Editar"
                            >
                              <Edit2 className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      <ViewResultModal
        isOpen={showViewModal}
        onClose={() => {
          setShowViewModal(false)
          setSelectedResultId(null)
        }}
        resultId={selectedResultId}
      />

      <AddResultModal
        isOpen={showCreateModal}
        onClose={() => {
          setShowCreateModal(false)
          setEditingResultId(null)
        }}
        onSuccess={() => {
          fetchResults()
          setShowCreateModal(false)
          setEditingResultId(null)
        }}
        resultId={editingResultId}
      />
    </DashboardLayout>
  )
}