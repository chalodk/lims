'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateClientModal from '@/components/clients/CreateClientModal'
import EditClientModal from '@/components/clients/EditClientModal'
import DeleteClientConfirmModal from '@/components/clients/DeleteClientConfirmModal'
import PlanUsageBanner from '@/components/billing/PlanUsageBanner'
import { useCompanyBillingUsage } from '@/hooks/useCompanyBillingUsage'
import { Client } from '@/types/database'
import {
  Plus,
  Search,
  Users,
  Loader2,
  Edit2,
  Trash2,
  ArrowUpDown,
  AlertCircle,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

const PAGE_SIZE = 25

const CLIENT_TYPE_OPTIONS = [
  { value: 'farmer', label: 'Agricultor' },
  { value: 'agricultural_company', label: 'Empresa Agrícola' },
  { value: 'research_institution', label: 'Institución de Investigación' },
  { value: 'government_agency', label: 'Agencia Gubernamental' },
  { value: 'consultant', label: 'Consultor' },
] as const

type SortKey = 'name' | 'created_at'
type SortDirection = 'asc' | 'desc'

const filterSelectClassName =
  'h-8 rounded-lg border border-gray-200 bg-white px-3 text-sm outline-none focus-visible:border-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20 sm:w-52'

export default function ClientsPage() {
  const { user } = useAuth()
  const { usage: billingUsage } = useCompanyBillingUsage(Boolean(user?.company_id))
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [typeFilter, setTypeFilter] = useState<string>('all')
  const [sortKey, setSortKey] = useState<SortKey>('name')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = useState(1)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  const supabase = getSupabaseClient()

  const fetchClients = useCallback(async () => {
    try {
      if (!user?.company_id) {
        console.log('No user company_id available yet, skipping fetch')
        return
      }

      const { data, error } = await supabase
        .from('clients')
        .select('*')
        .eq('company_id', user.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setClients(data || [])
    } catch (error) {
      console.error('Error fetching clients:', error)
    } finally {
      setIsLoading(false)
    }
  }, [supabase, user?.company_id])

  useEffect(() => {
    fetchClients()
  }, [fetchClients])

  useEffect(() => {
    setCurrentPage(1)
  }, [searchTerm, typeFilter, sortKey, sortDirection])

  const getClientTypeLabel = (type: string | null) => {
    return CLIENT_TYPE_OPTIONS.find((option) => option.value === type)?.label || 'No especificado'
  }

  const getClientTypeBadgeClass = (type: string | null) => {
    const colors: Record<string, string> = {
      farmer: 'border-green-200 bg-green-50 text-green-800',
      agricultural_company: 'border-sky-200 bg-sky-50 text-sky-800',
      research_institution: 'border-violet-200 bg-violet-50 text-violet-800',
      government_agency: 'border-rose-200 bg-rose-50 text-rose-800',
      consultant: 'border-amber-200 bg-amber-50 text-amber-800',
    }
    return colors[type || ''] || 'border-gray-200 bg-gray-50 text-gray-700'
  }

  const filteredClients = useMemo(() => {
    const normalizedSearch = searchTerm.trim().toLowerCase()

    const filtered = clients.filter((client) => {
      const matchesType = typeFilter === 'all' || client.client_type === typeFilter
      if (!matchesType) return false

      if (!normalizedSearch) return true

      return (
        client.name.toLowerCase().includes(normalizedSearch) ||
        client.rut?.toLowerCase().includes(normalizedSearch) ||
        client.contact_email?.toLowerCase().includes(normalizedSearch) ||
        client.phone?.toLowerCase().includes(normalizedSearch)
      )
    })

    filtered.sort((clientA, clientB) => {
      let comparison = 0

      if (sortKey === 'name') {
        comparison = clientA.name.localeCompare(clientB.name, 'es', { sensitivity: 'base' })
      } else {
        const dateA = clientA.created_at ? new Date(clientA.created_at).getTime() : 0
        const dateB = clientB.created_at ? new Date(clientB.created_at).getTime() : 0
        comparison = dateA - dateB
      }

      return sortDirection === 'asc' ? comparison : -comparison
    })

    return filtered
  }, [clients, searchTerm, typeFilter, sortKey, sortDirection])

  const totalPages = Math.max(1, Math.ceil(filteredClients.length / PAGE_SIZE))
  const safePage = Math.min(currentPage, totalPages)
  const paginatedClients = filteredClients.slice(
    (safePage - 1) * PAGE_SIZE,
    safePage * PAGE_SIZE
  )

  const toggleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
      return
    }
    setSortKey(key)
    setSortDirection(key === 'name' ? 'asc' : 'desc')
  }

  const handleEditClient = (client: Client) => {
    setSelectedClient(client)
    setShowEditModal(true)
  }

  const handleDeleteClient = (client: Client) => {
    setSelectedClient(client)
    setShowDeleteConfirm(true)
  }

  const confirmDeleteClient = async () => {
    if (!selectedClient) return

    setIsDeleting(true)

    try {
      const { data: relatedSamples, error: checkError } = await supabase
        .from('samples')
        .select('id')
        .eq('client_id', selectedClient.id)
        .limit(1)

      if (checkError && !checkError.message.includes('does not exist')) {
        console.warn('Error checking related samples:', checkError)
      }

      const { data: deletedRows, error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', selectedClient.id)
        .eq('company_id', user?.company_id)
        .select('id')

      if (deleteError) {
        if (
          deleteError.message.includes('foreign key') ||
          deleteError.message.includes('violates foreign key constraint') ||
          deleteError.code === '23503'
        ) {
          alert(
            `No se puede eliminar el cliente "${selectedClient.name}" porque tiene registros asociados ` +
              `(muestras u otros datos). Para mantener la integridad de los datos históricos, ` +
              `los clientes con registros asociados no pueden ser eliminados.`
          )
          return
        }
        throw deleteError
      }

      if (!deletedRows?.length) {
        alert(
          'No se pudo eliminar el cliente. Puede que falte una política de permisos en la base de datos (RLS DELETE en la tabla clients).'
        )
        return
      }

      setShowDeleteConfirm(false)
      setSelectedClient(null)
      await fetchClients()

      if (relatedSamples && relatedSamples.length > 0) {
        alert(
          `Cliente eliminado exitosamente. ` +
            `Los registros históricos (muestras) mantienen la referencia al cliente eliminado.`
        )
      }
    } catch (error: unknown) {
      console.error('Error deleting client:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      alert('Error al eliminar el cliente: ' + errorMessage)
    } finally {
      setIsDeleting(false)
    }
  }

  if (isLoading) {
    return (
      <DashboardLayout>
        <div className="flex h-64 items-center justify-center p-6">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      </DashboardLayout>
    )
  }

  const resultLabel =
    filteredClients.length === clients.length
      ? `${clients.length} cliente${clients.length === 1 ? '' : 's'}`
      : `${filteredClients.length} de ${clients.length} clientes`

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">
              Gestión de Clientes
            </h1>
            <p className="text-sm text-muted-foreground">
              Administra la información de tus clientes
            </p>
          </div>
          <Button type="button" onClick={() => setShowAddModal(true)} className="gap-2">
            <Plus className="h-4 w-4" />
            Nuevo cliente
          </Button>
        </div>

        <PlanUsageBanner usage={billingUsage} focus="clients" />

        <Card>
          <CardContent className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar por nombre, RUT, email o teléfono..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value)}
              className={filterSelectClassName}
            >
              <option value="all">Todos los tipos</option>
              {CLIENT_TYPE_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </CardContent>
        </Card>

        <Card className="overflow-hidden">
          <CardHeader className="border-b border-gray-100 py-3">
            <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
              <CardDescription>
                {filteredClients.length > 0
                  ? 'Haz clic en una fila para editar el cliente'
                  : 'Sin resultados para los filtros actuales'}
              </CardDescription>
              <p className="text-xs font-medium text-muted-foreground">{resultLabel}</p>
            </div>
          </CardHeader>

          {filteredClients.length === 0 ? (
            <CardContent className="flex flex-col items-center py-12 text-center">
              <Users className="mb-4 h-10 w-10 text-muted-foreground" />
              <CardTitle className="mb-2 text-lg">
                {clients.length === 0 ? 'No hay clientes' : 'Sin coincidencias'}
              </CardTitle>
              <CardDescription className="mb-4">
                {clients.length === 0
                  ? 'Comienza agregando tu primer cliente'
                  : 'Prueba con otro término de búsqueda o filtro'}
              </CardDescription>
              {clients.length === 0 ? (
                <Button type="button" onClick={() => setShowAddModal(true)} className="gap-2">
                  <Plus className="h-4 w-4" />
                  Agregar cliente
                </Button>
              ) : null}
            </CardContent>
          ) : (
            <>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="min-w-[180px]">
                        <button
                          type="button"
                          onClick={() => toggleSort('name')}
                          className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
                        >
                          Nombre
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="hidden min-w-[110px] md:table-cell">RUT</TableHead>
                      <TableHead className="min-w-[130px]">Tipo</TableHead>
                      <TableHead className="hidden min-w-[180px] lg:table-cell">Contacto</TableHead>
                      <TableHead className="hidden whitespace-nowrap xl:table-cell">
                        <button
                          type="button"
                          onClick={() => toggleSort('created_at')}
                          className="inline-flex items-center gap-1.5 font-medium hover:text-foreground"
                        >
                          Desde
                          <ArrowUpDown className="h-3.5 w-3.5" />
                        </button>
                      </TableHead>
                      <TableHead className="sticky right-0 w-28 bg-card text-right">
                        Acciones
                      </TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {paginatedClients.map((client) => (
                      <TableRow
                        key={client.id}
                        className="cursor-pointer border-l-2 border-transparent hover:border-primary/40 hover:bg-accent/40"
                        onClick={() => handleEditClient(client)}
                      >
                        <TableCell>
                          <div className="flex min-w-0 items-center gap-2">
                            {client.observation ? (
                              <span
                                title="Cliente con observación"
                                className="inline-flex shrink-0"
                              >
                                <AlertCircle className="h-4 w-4 text-red-500" />
                              </span>
                            ) : null}
                            <div className="min-w-0">
                              <p className="truncate font-medium text-foreground">{client.name}</p>
                              <p className="truncate text-xs text-muted-foreground md:hidden">
                                {client.rut || 'Sin RUT'}
                              </p>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell className="hidden text-sm text-muted-foreground md:table-cell">
                          {client.rut || '—'}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={cn(
                              'font-normal',
                              getClientTypeBadgeClass(client.client_type)
                            )}
                          >
                            {getClientTypeLabel(client.client_type)}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden lg:table-cell">
                          <div className="min-w-0 space-y-0.5">
                            <p className="truncate text-sm text-foreground">
                              {client.contact_email || '—'}
                            </p>
                            <p className="truncate text-xs text-muted-foreground">
                              {client.phone || 'Sin teléfono'}
                            </p>
                          </div>
                        </TableCell>
                        <TableCell className="hidden whitespace-nowrap text-sm text-muted-foreground xl:table-cell">
                          {client.created_at
                            ? new Date(client.created_at).toLocaleDateString('es-CL')
                            : '—'}
                        </TableCell>
                        <TableCell
                          className="sticky right-0 bg-card text-right"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="inline-flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleEditClient(client)}
                              title="Editar cliente"
                            >
                              <Edit2 className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDeleteClient(client)}
                              title="Eliminar cliente"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>

              {filteredClients.length > PAGE_SIZE ? (
                <div className="flex flex-col gap-3 border-t border-gray-100 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-xs text-muted-foreground">
                    Mostrando {(safePage - 1) * PAGE_SIZE + 1}–
                    {Math.min(safePage * PAGE_SIZE, filteredClients.length)} de{' '}
                    {filteredClients.length}
                  </p>
                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage <= 1}
                      onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}
                    >
                      Anterior
                    </Button>
                    <span className="text-xs text-muted-foreground">
                      Página {safePage} de {totalPages}
                    </span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      disabled={safePage >= totalPages}
                      onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}
                    >
                      Siguiente
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Card>

        <CreateClientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />

        <EditClientModal
          isOpen={showEditModal}
          onClose={() => {
            setShowEditModal(false)
            setSelectedClient(null)
          }}
          onSuccess={() => {
            fetchClients()
            setShowEditModal(false)
            setSelectedClient(null)
          }}
          client={selectedClient}
        />

        <DeleteClientConfirmModal
          isOpen={showDeleteConfirm}
          onClose={() => {
            if (!isDeleting) {
              setShowDeleteConfirm(false)
              setSelectedClient(null)
            }
          }}
          onConfirm={confirmDeleteClient}
          clientName={selectedClient?.name || ''}
          isDeleting={isDeleting}
        />
      </div>
    </DashboardLayout>
  )
}
