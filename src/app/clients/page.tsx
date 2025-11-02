'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import DashboardLayout from '@/components/layout/DashboardLayout'
import CreateClientModal from '@/components/clients/CreateClientModal'
import EditClientModal from '@/components/clients/EditClientModal'
import DeleteClientConfirmModal from '@/components/clients/DeleteClientConfirmModal'
import { Client } from '@/types/database'
import { 
  Plus,
  Search,
  Users,
  Mail,
  Phone,
  MapPin,
  Loader2,
  Edit,
  Trash2
} from 'lucide-react'

export default function ClientsPage() {
  const { user } = useAuth()
  const [clients, setClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [selectedClient, setSelectedClient] = useState<Client | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)
  
  const supabase = getSupabaseClient()

  const fetchClients = useCallback(async () => {
    try {
      // Don't fetch if user data is not loaded yet
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

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.rut?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.contact_email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const getClientTypeLabel = (type: string | null) => {
    const types = {
      farmer: 'Agricultor',
      agricultural_company: 'Empresa Agrícola',
      research_institution: 'Institución de Investigación',
      government_agency: 'Agencia Gubernamental',
      consultant: 'Consultor'
    }
    return types[type as keyof typeof types] || 'No especificado'
  }

  const getClientTypeColor = (type: string | null) => {
    const colors = {
      farmer: 'bg-green-100 text-green-800',
      agricultural_company: 'bg-blue-100 text-blue-800',
      research_institution: 'bg-purple-100 text-purple-800',
      government_agency: 'bg-red-100 text-red-800',
      consultant: 'bg-yellow-100 text-yellow-800'
    }
    return colors[type as keyof typeof colors] || 'bg-gray-100 text-gray-800'
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
      // First, check if there are related records (samples) to inform the user
      // This is informational only - we'll still allow deletion
      const { data: relatedSamples, error: checkError } = await supabase
        .from('samples')
        .select('id')
        .eq('client_id', selectedClient.id)
        .limit(1)

      if (checkError && !checkError.message.includes('does not exist')) {
        console.warn('Error checking related samples:', checkError)
      }

      // Delete the client
      // Note: Supabase will enforce foreign key constraints if ON DELETE RESTRICT is set
      // If the constraint allows, the deletion will proceed
      // Historical records will maintain the client_id reference
      const { error: deleteError } = await supabase
        .from('clients')
        .delete()
        .eq('id', selectedClient.id)
        .eq('company_id', user?.company_id) // Additional security: ensure user can only delete their company's clients

      if (deleteError) {
        // Handle foreign key constraint violations
        if (deleteError.message.includes('foreign key') || 
            deleteError.message.includes('violates foreign key constraint') ||
            deleteError.code === '23503') {
          alert(
            `No se puede eliminar el cliente "${selectedClient.name}" porque tiene registros asociados ` +
            `(muestras u otros datos). Para mantener la integridad de los datos históricos, ` +
            `los clientes con registros asociados no pueden ser eliminados.`
          )
          return
        }
        throw deleteError
      }

      // Success
      setShowDeleteConfirm(false)
      setSelectedClient(null)
      
      // Refresh clients list
      await fetchClients()

      // Inform user if there were related records (these are preserved)
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
        <div className="p-6">
          <div className="flex items-center justify-center h-64">
            <Loader2 className="h-8 w-8 animate-spin text-green-600" />
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
              <h1 className="text-2xl font-bold text-gray-900">Gestión de Clientes</h1>
              <p className="text-gray-600">Administra la información de tus clientes</p>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors"
            >
              <Plus className="h-4 w-4" />
              <span>Nuevo cliente</span>
            </button>
          </div>
        </div>

        {/* Search */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4 mb-6">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Buscar por nombre, RUT o email..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
            />
          </div>
        </div>

        {/* Clients Grid */}
        {filteredClients.length === 0 ? (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No hay clientes</h3>
            <p className="text-gray-500 mb-4">Comienza agregando tu primer cliente</p>
            <button 
              onClick={() => setShowAddModal(true)}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg inline-flex items-center space-x-2"
            >
              <Plus className="h-4 w-4" />
              <span>Agregar cliente</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredClients.map((client) => (
              <div key={client.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-lg font-semibold text-gray-900 mb-1">{client.name}</h3>
                    {client.rut && (
                      <p className="text-sm text-gray-500 mb-2">RUT: {client.rut}</p>
                    )}
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getClientTypeColor(client.client_type)}`}>
                      {getClientTypeLabel(client.client_type)}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleEditClient(client)
                      }}
                      className="p-1 text-gray-400 hover:text-green-600 transition-colors"
                      title="Editar cliente"
                    >
                      <Edit className="h-4 w-4" />
                    </button>
                    <button 
                      onClick={(e) => {
                        e.stopPropagation()
                        handleDeleteClient(client)
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 transition-colors"
                      title="Eliminar cliente"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>

                <div className="space-y-3">
                  {client.contact_email && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="truncate">{client.contact_email}</span>
                    </div>
                  )}

                  {client.phone && (
                    <div className="flex items-center text-sm text-gray-600">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span>{client.phone}</span>
                    </div>
                  )}

                  {client.address && (
                    <div className="flex items-start text-sm text-gray-600">
                      <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5 flex-shrink-0" />
                      <span className="line-clamp-2">{client.address}</span>
                    </div>
                  )}
                </div>

                <div className="mt-4 pt-4 border-t border-gray-200">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Cliente desde</span>
                    <span className="text-gray-900 font-medium">
                      {client.created_at ? new Date(client.created_at).toLocaleDateString('es-ES') : 'N/A'}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Client Modal */}
        <CreateClientModal
          isOpen={showAddModal}
          onClose={() => setShowAddModal(false)}
          onSuccess={fetchClients}
        />

        {/* Edit Client Modal */}
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

        {/* Delete Client Confirmation Modal */}
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