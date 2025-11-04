'use client'

import { useState, useEffect, useCallback } from 'react'
import { X, Link2, Search, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/singleton'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
}

interface Client {
  id: string
  name: string
  rut?: string
  contact_email?: string
}

interface LinkedClient {
  id: string
  client_id: string
  created_at: string
  clients: Client
}

interface LinkUserClientsModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onSuccess: () => void
}

export default function LinkUserClientsModal({ isOpen, onClose, user, onSuccess }: LinkUserClientsModalProps) {
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([])
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')
  
  const supabase = getSupabaseClient()

  // Cargar clientes vinculados
  const fetchLinkedClients = useCallback(async () => {
    if (!user?.id) return
    
    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/settings/users/${user.id}/clients`)
      const data = await response.json()
      
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar clientes vinculados')
      }
      
      setLinkedClients(data.clients || [])
    } catch (err) {
      console.error('Error fetching linked clients:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar clientes vinculados')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  // Cargar clientes disponibles
  const fetchAvailableClients = useCallback(async () => {
    try {
      // Obtener el company_id del usuario actual
      const { data: { user: currentUser } } = await supabase.auth.getUser()
      if (!currentUser) return

      const { data: currentUserData } = await supabase
        .from('users')
        .select('company_id')
        .eq('id', currentUser.id)
        .single()

      if (!currentUserData?.company_id) return

      const { data: clients, error } = await supabase
        .from('clients')
        .select('id, name, rut, contact_email')
        .eq('company_id', currentUserData.company_id)
        .order('name', { ascending: true })

      if (error) throw error
      setAvailableClients(clients || [])
    } catch (err) {
      console.error('Error fetching available clients:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar clientes disponibles')
    }
  }, [supabase])

  useEffect(() => {
    if (isOpen && user) {
      fetchLinkedClients()
      fetchAvailableClients()
      setSearchTerm('')
      setSelectedClientId('')
      setError(null)
    }
  }, [isOpen, user, fetchLinkedClients, fetchAvailableClients])

  const handleLinkClient = async () => {
    if (!selectedClientId || !user?.id) return

    try {
      setIsLinking(true)
      setError(null)

      const response = await fetch(`/api/settings/users/${user.id}/clients`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          client_id: selectedClientId
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al vincular cliente')
      }

      // Recargar la lista de clientes vinculados
      await fetchLinkedClients()
      setSelectedClientId('')
      onSuccess()
    } catch (err) {
      console.error('Error linking client:', err)
      setError(err instanceof Error ? err.message : 'Error al vincular cliente')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkClient = async (clientId: string) => {
    if (!user?.id) return

    if (!confirm('¿Estás seguro de que deseas eliminar este vínculo?')) {
      return
    }

    try {
      setIsDeleting(clientId)
      setError(null)

      const response = await fetch(`/api/settings/users/${user.id}/clients/${clientId}`, {
        method: 'DELETE'
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar vínculo')
      }

      // Recargar la lista de clientes vinculados
      await fetchLinkedClients()
      onSuccess()
    } catch (err) {
      console.error('Error unlinking client:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar vínculo')
    } finally {
      setIsDeleting(null)
    }
  }

  // Filtrar clientes disponibles (excluir el ya vinculado si existe)
  const linkedClientIds = new Set(linkedClients.map(lc => lc.client_id))
  const filteredAvailableClients = availableClients
    .filter(client => !linkedClientIds.has(client.id))
    .filter(client => {
      if (!searchTerm) return true
      const search = searchTerm.toLowerCase()
      return (
        client.name.toLowerCase().includes(search) ||
        client.rut?.toLowerCase().includes(search) ||
        client.contact_email?.toLowerCase().includes(search)
      )
    })

  const handleClose = () => {
    if (!isLinking && !isDeleting) {
      setSearchTerm('')
      setSelectedClientId('')
      setError(null)
      onClose()
    }
  }

  if (!isOpen || !user) return null

  // Solo mostrar para usuarios con rol consumidor
  if (user.role !== 'consumidor') {
    return null
  }

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={handleClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center">
                <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100">
                  <Link2 className="h-6 w-6 text-green-600" />
                </div>
                <div className="ml-4">
                  <h3 className="text-lg leading-6 font-medium text-gray-900">
                    Vincular Clientes
                  </h3>
                  <p className="text-sm text-gray-500">
                    {user.name} - {user.email}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="rounded-md text-gray-400 hover:text-gray-600 focus:outline-none focus:ring-2 focus:ring-green-500"
                disabled={isLinking || !!isDeleting}
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-800 text-sm">
                {error}
              </div>
            )}

            {/* Cliente Vinculado */}
            <div className="mb-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2" />
                Cliente Vinculado
              </h4>
              
              {isLoading ? (
                <div className="flex items-center justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-green-600" />
                </div>
              ) : linkedClients.length === 0 ? (
                <div className="text-center py-8 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">No hay cliente vinculado</p>
                  <p className="text-xs text-gray-400 mt-1">Selecciona un cliente de la lista para vincularlo</p>
                </div>
              ) : (
                <div className="space-y-2">
                  {linkedClients.map((linkedClient) => (
                    <div
                      key={linkedClient.id}
                      className="flex items-center justify-between p-3 bg-green-50 rounded-lg border border-green-200"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900">
                          {linkedClient.clients.name}
                        </p>
                        {linkedClient.clients.rut && (
                          <p className="text-xs text-gray-500">RUT: {linkedClient.clients.rut}</p>
                        )}
                        {linkedClient.clients.contact_email && (
                          <p className="text-xs text-gray-500">{linkedClient.clients.contact_email}</p>
                        )}
                      </div>
                      <button
                        onClick={() => handleUnlinkClient(linkedClient.client_id)}
                        disabled={isDeleting === linkedClient.client_id}
                        className="ml-4 p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md transition-colors disabled:opacity-50"
                        title="Eliminar vínculo"
                      >
                        {isDeleting === linkedClient.client_id ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          <Trash2 className="h-4 w-4" />
                        )}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Agregar Nuevo Cliente */}
            <div className="border-t border-gray-200 pt-6">
              <h4 className="text-sm font-medium text-gray-900 mb-3 flex items-center">
                <Plus className="h-4 w-4 mr-2" />
                Vincular Nuevo Cliente
              </h4>

              {/* Buscador */}
              <div className="mb-4">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Buscar cliente por nombre, RUT o email..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                  />
                </div>
              </div>

              {/* Lista de clientes disponibles */}
              {filteredAvailableClients.length === 0 ? (
                <div className="text-center py-4 bg-gray-50 rounded-lg border border-gray-200">
                  <p className="text-sm text-gray-500">
                    {searchTerm ? 'No se encontraron clientes' : 'No hay clientes disponibles para vincular'}
                  </p>
                </div>
              ) : (
                <div className="mb-4 max-h-48 overflow-y-auto border border-gray-200 rounded-lg">
                  {filteredAvailableClients.map((client) => (
                    <button
                      key={client.id}
                      type="button"
                      onClick={() => setSelectedClientId(client.id)}
                      className={`w-full text-left p-3 hover:bg-gray-50 transition-colors border-b border-gray-200 last:border-b-0 ${
                        selectedClientId === client.id ? 'bg-green-50 border-green-200' : ''
                      }`}
                    >
                      <p className="text-sm font-medium text-gray-900">{client.name}</p>
                      {client.rut && (
                        <p className="text-xs text-gray-500">RUT: {client.rut}</p>
                      )}
                      {client.contact_email && (
                        <p className="text-xs text-gray-500">{client.contact_email}</p>
                      )}
                    </button>
                  ))}
                </div>
              )}

              {/* Botón de vincular */}
              <button
                type="button"
                onClick={handleLinkClient}
                disabled={!selectedClientId || isLinking}
                className="w-full flex items-center justify-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {isLinking ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Vinculando...
                  </>
                ) : (
                  <>
                    <Link2 className="h-4 w-4 mr-2" />
                    Vincular Cliente Seleccionado
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

