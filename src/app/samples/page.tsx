'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateSampleModal from '@/components/samples/CreateSampleModal'
import EditSampleModal from '@/components/samples/EditSampleModal'
import ViewSampleModal from '@/components/samples/ViewSampleModal'
import DeleteConfirmModal from '@/components/samples/DeleteConfirmModal'
import PlanUsageBanner from '@/components/billing/PlanUsageBanner'
import { useCompanyBillingUsage } from '@/hooks/useCompanyBillingUsage'
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
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export default function SamplesPage() {
  const { userRole } = useAuth()
  const { usage: billingUsage } = useCompanyBillingUsage()
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
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Gestión de Muestras
            </h1>
            <p className="text-sm text-muted-foreground">
              Administra y realiza seguimiento de todas las muestras
            </p>
          </div>
          <Button type="button" onClick={() => setShowCreateModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nueva muestra
          </Button>
        </div>

        <PlanUsageBanner usage={billingUsage} focus="samples" />

        <Card>
          <CardContent className="flex flex-col gap-4 p-4 sm:flex-row">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por código, especie o cliente..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20 sm:w-48"
            >
              <option value="all">Todos los estados</option>
              <option value="received">Recibidas</option>
              <option value="processing">Procesando</option>
              <option value="validation">Validación</option>
              <option value="completed">Completadas</option>
            </select>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          {filteredSamples.length > 0 && (
            <CardHeader className="border-b border-gray-100 py-3">
              <CardDescription>
                Haz clic en cualquier fila para ver los detalles completos de la muestra
              </CardDescription>
            </CardHeader>
          )}
          {filteredSamples.length === 0 ? (
            <CardContent className="flex flex-col items-center py-12 text-center">
              <TestTube className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">No hay muestras</CardTitle>
              <CardDescription>Comienza agregando tu primera muestra</CardDescription>
            </CardContent>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="min-w-[120px]">Código</TableHead>
                    <TableHead className="min-w-[150px]">Cliente</TableHead>
                    <TableHead className="min-w-[120px]">Especie</TableHead>
                    <TableHead className="hidden md:table-cell">Estado</TableHead>
                    <TableHead className="hidden lg:table-cell">Prioridad</TableHead>
                    <TableHead className="hidden whitespace-nowrap lg:table-cell">Fecha</TableHead>
                    <TableHead className="w-32 sticky right-0 bg-card">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredSamples.map((sample) => (
                    <TableRow
                      key={sample.id}
                      className="cursor-pointer border-l-2 border-transparent hover:border-primary/40 hover:bg-accent/40"
                      onClick={() => handleViewSample(sample)}
                    >
                      <TableCell>
                        <div className="flex min-w-0 items-center">
                          {getStatusIcon(sample.status)}
                          <span className="ml-2 truncate font-medium text-foreground">
                            {sample.code}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">
                            {sample.clients?.name || 'Sin asignar'}
                          </div>
                          <div className="truncate text-xs text-muted-foreground">
                            {sample.clients?.contact_email || 'Cliente no especificado'}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="min-w-0">
                          <div className="truncate font-medium text-foreground">{sample.species}</div>
                          {sample.variety && (
                            <div className="truncate text-xs text-muted-foreground">{sample.variety}</div>
                          )}
                        </div>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {getSampleStatusBadge(sample.status)}
                      </TableCell>
                      <TableCell className="hidden lg:table-cell">
                        {getSlaTypeBadge(sample.sla_type)}
                      </TableCell>
                      <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground lg:table-cell">
                        {formatDate(sample.received_date)}
                      </TableCell>
                      <TableCell
                        className="sticky right-0 bg-card"
                        onClick={(e) => e.stopPropagation()}
                      >
                        <div className="flex items-center gap-1">
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon-sm"
                            onClick={(e) => {
                              e.stopPropagation()
                              handleViewSample(sample)
                            }}
                            title="Ver detalles"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          {(userRole === 'admin' || userRole === 'validador' || userRole === 'comun') && (
                            <>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleEditSample(sample)
                                }}
                                title="Editar"
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                              <Button
                                type="button"
                                variant="ghost"
                                size="icon-sm"
                                onClick={(e) => {
                                  e.stopPropagation()
                                  handleDeleteSample(sample)
                                }}
                                title="Eliminar"
                                className="text-destructive hover:text-destructive"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>

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