'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateSampleModal from '@/components/samples/CreateSampleModal'
import EditSampleModal from '@/components/samples/EditSampleModal'
import ViewSampleModal from '@/components/samples/ViewSampleModal'
import DeleteConfirmModal from '@/components/samples/DeleteConfirmModal'
import { SampleWithClient } from '@/types/database'
import { formatDate } from '@/lib/utils/formatters'
import { getSampleStatusBadge, getSlaTypeBadge } from '@/lib/utils/badges'
import { 
  Plus,
  Search,
  TestTube,
  AlertCircle,
  CheckCircle,
  Clock,
  Loader2,
  Eye,
  Edit2,
  Trash2
} from 'lucide-react'

export default function SamplesPage() {
  const { userRole } = useAuth()
  const [samples, setSamples] = useState<SampleWithClient[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [selectedSample, setSelectedSample] = useState<SampleWithClient | null>(null)
  const [editingSample, setEditingSample] = useState<SampleWithClient | null>(null)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showViewModal, setShowViewModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  
  const supabase = getSupabaseClient()

  const fetchSamples = useCallback(async () => {
    try {
      let query = supabase
        .from('samples')
        .select(`
          *,
          clients (
            id,
            name,
            contact_email
          ),
          sample_tests (
            id,
            test_catalog (
              id,
              code,
              name,
              area
            ),
            methods (
              id,
              code,
              name
            )
          )
        `)
        .order('created_at', { ascending: false })

      if (statusFilter !== 'all') {
        query = query.eq('status', statusFilter)
      }

      const { data, error } = await query

      if (error) {
        console.error('Database error:', error)
        throw error
      }

      setSamples(data || [])
    } catch (error) {
      console.error('Error fetching samples:', error)
      // Set empty array to avoid infinite loading
      setSamples([])
    } finally {
      setIsLoading(false)
    }
  }, [statusFilter, supabase])

  const checkActualSchema = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('*')
        .limit(1)
        
      if (data && data.length > 0) {
        console.log('Actual sample columns:', Object.keys(data[0]))
      } else if (!error) {
        console.log('No samples exist yet - will see columns after creating first sample')
      }
    } catch (error) {
      console.log('Schema check failed:', error)
    }
  }, [supabase])

  useEffect(() => {
    fetchSamples()
    checkActualSchema()
  }, [fetchSamples, checkActualSchema])

  const filteredSamples = samples.filter(sample =>
    sample.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    sample.species.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const handleViewSample = (sample: SampleWithClient) => {
    setSelectedSample(sample)
    setShowViewModal(true)
  }

  const handleEditSample = (sample: SampleWithClient) => {
    setEditingSample(sample)
    setShowEditModal(true)
  }

  const handleDeleteSample = (sample: SampleWithClient) => {
    setSelectedSample(sample)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteSample = async () => {
    if (!selectedSample) return
    
    try {
      const response = await fetch(`/api/samples/${selectedSample.id}`, {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
        },
      })

      if (!response.ok) {
        const errorData = await response.json()
        const errorMessage = errorData.error || 'Error al eliminar la muestra'
        
        // Handle specific error cases
        if (response.status === 401) {
          throw new Error('No estás autenticado. Por favor, inicia sesión nuevamente.')
        } else if (response.status === 403) {
          throw new Error('No tienes permiso para eliminar esta muestra.')
        } else if (response.status === 404) {
          throw new Error('La muestra no fue encontrada.')
        } else {
          throw new Error(errorMessage)
        }
      }

      const result = await response.json()
      
      // Refresh the samples list
      await fetchSamples()
      setShowDeleteConfirm(false)
      setSelectedSample(null)
    } catch (error) {
      console.error('Error deleting sample:', error)
      const errorMessage = error instanceof Error 
        ? error.message 
        : 'Error al eliminar la muestra'
      alert(errorMessage)
    }
  }

  const getStatusIcon = (status: string | null) => {
    if (!status) return <TestTube className="h-4 w-4 text-gray-500" />
    
    switch (status) {
      case 'received':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'processing':
        return <Loader2 className="h-4 w-4 text-yellow-500 animate-spin" />
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'validation':
        return <AlertCircle className="h-4 w-4 text-purple-500" />
      default:
        return <TestTube className="h-4 w-4 text-gray-500" />
    }
  }

  // Badge functions moved to shared utilities

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
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Muestras</h1>
              <p className="text-gray-600">Administra y realiza seguimiento de todas las muestras</p>
            </div>
            <div className="flex items-center space-x-3">
              <button 
                onClick={() => setShowCreateModal(true)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
              >
                <Plus className="h-4 w-4" />
                <span>Nueva muestra</span>
              </button>
            </div>
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
                  placeholder="Buscar por código, especie o cliente..."
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
                <option value="received">Recibidas</option>
                <option value="processing">Procesando</option>
                <option value="validation">Validación</option>
                <option value="completed">Completadas</option>
              </select>
            </div>
          </div>
        </div>

        {/* Samples List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {filteredSamples.length > 0 && (
            <div className="px-6 py-3 bg-gray-50 border-b border-gray-200">
              <p className="text-sm text-gray-600">
                💡 Haz clic en cualquier fila para ver los detalles completos de la muestra
              </p>
            </div>
          )}
          {filteredSamples.length === 0 ? (
            <div className="p-12 text-center">
              <TestTube className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No hay muestras</h3>
              <p className="text-gray-500">Comienza agregando tu primera muestra</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50 border-b border-gray-200">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Código
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Cliente
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Especie
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Estado
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Prioridad
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
                  {filteredSamples.map((sample) => (
                    <tr 
                      key={sample.id} 
                      className="hover:bg-indigo-50 cursor-pointer transition-colors border-l-2 border-transparent hover:border-indigo-200"
                      onClick={() => handleViewSample(sample)}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center">
                          {getStatusIcon(sample.status)}
                          <span className="ml-2 font-medium text-gray-900">{sample.code}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">
                            {sample.clients?.name || 'Sin asignar'}
                          </div>
                          <div className="text-sm text-gray-500">
                            {sample.clients?.contact_email || 'Cliente no especificado'}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div>
                          <div className="font-medium text-gray-900">{sample.species}</div>
                          {sample.variety && (
                            <div className="text-sm text-gray-500">{sample.variety}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {getSampleStatusBadge(sample.status)}
                      </td>
                      <td className="px-6 py-4">
                        {getSlaTypeBadge(sample.sla_type)}
                      </td>
                      <td className="px-6 py-4 text-sm text-gray-500">
                        {formatDate(sample.received_date)}
                      </td>
                      <td className="px-6 py-4" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center space-x-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewSample(sample)
                            }}
                            className="p-1 text-gray-400 hover:text-indigo-600 transition-colors"
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          {(userRole === 'admin' || userRole === 'validador' || userRole === 'comun') && (
                            <>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSample(sample)
                                }}
                                className="p-1 text-gray-400 hover:text-blue-600 transition-colors"
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </button>
                              <button
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSample(sample)
                                }}
                                className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                                title="Eliminar"
                              >
                                <Trash2 className="h-4 w-4" />
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

        {/* Create Sample Modal */}
        <CreateSampleModal 
          isOpen={showCreateModal}
          onClose={() => {
            setShowCreateModal(false)
          }}
          onSuccess={() => {
            fetchSamples()
            setShowCreateModal(false)
          }}
        />

        {/* Edit Sample Modal */}
        {editingSample && (
          <EditSampleModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setEditingSample(null)
            }}
            onSuccess={() => {
              fetchSamples()
              setShowEditModal(false)
              setEditingSample(null)
            }}
            sample={editingSample}
          />
        )}

        {/* View Sample Modal */}
        {selectedSample && (
          <ViewSampleModal
            isOpen={showViewModal}
            onClose={() => {
              setShowViewModal(false)
              setSelectedSample(null)
            }}
            sample={selectedSample}
          />
        )}


        {/* Delete Confirmation Modal */}
        {selectedSample && (
          <DeleteConfirmModal
            isOpen={showDeleteConfirm}
            onClose={() => {
              setShowDeleteConfirm(false)
              setSelectedSample(null)
            }}
            onConfirm={confirmDeleteSample}
            sampleCode={selectedSample.code}
          />
        )}
      </div>
    </DashboardLayout>
  )
}