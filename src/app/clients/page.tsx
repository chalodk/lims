'use client'

import { useState, useEffect, useCallback } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { createClient } from '@/lib/supabase/client'
import DashboardLayout from '@/components/layout/DashboardLayout'
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
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    contact_email: '',
    phone: '',
    address: '',
    client_type: 'farmer'
  })
  
  const supabase = createClient()

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('clients')
        .insert([
          {
            ...formData,
            company_id: user?.company_id,
            rut: formData.rut || null,
            contact_email: formData.contact_email || null,
            phone: formData.phone || null,
            address: formData.address || null,
          }
        ])

      if (error) throw error

      // Reset form and close modal
      setFormData({
        name: '',
        rut: '',
        contact_email: '',
        phone: '',
        address: '',
        client_type: 'farmer'
      })
      setShowAddModal(false)
      
      // Refresh clients list
      await fetchClients()
    } catch (error: unknown) {
      console.error('Error creating client:', error)
      alert('Error al crear el cliente: ' + (error instanceof Error ? error.message : 'Error desconocido'))
    } finally {
      setIsSubmitting(false)
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
                    <button className="p-1 text-gray-400 hover:text-green-600 transition-colors">
                      <Edit className="h-4 w-4" />
                    </button>
                    <button className="p-1 text-gray-400 hover:text-red-600 transition-colors">
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
                      {new Date(client.created_at).toLocaleDateString('es-ES')}
                    </span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Add Client Modal */}
        {showAddModal && (
          <div className="fixed inset-0 z-50 overflow-y-auto">
            <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
              <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={() => setShowAddModal(false)} />
              
              <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
                <form onSubmit={handleSubmit}>
                  <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                    <div className="sm:flex sm:items-start mb-4">
                                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
            <Users className="h-6 w-6 text-green-600" />
                      </div>
                      <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left">
                        <h3 className="text-lg leading-6 font-medium text-gray-900">
                          Nuevo Cliente
                        </h3>
                        <div className="mt-2">
                          <p className="text-sm text-gray-500">
                            Agrega un nuevo cliente al sistema
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {/* Name */}
                      <div className="sm:col-span-2">
                        <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">
                          Nombre *
                        </label>
                        <input
                          type="text"
                          id="name"
                          required
                          value={formData.name}
                          onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Nombre del cliente"
                        />
                      </div>

                      {/* RUT */}
                      <div>
                        <label htmlFor="rut" className="block text-sm font-medium text-gray-700 mb-1">
                          RUT
                        </label>
                        <input
                          type="text"
                          id="rut"
                          value={formData.rut}
                          onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="12.345.678-9"
                        />
                      </div>

                      {/* Client Type */}
                      <div>
                        <label htmlFor="client_type" className="block text-sm font-medium text-gray-700 mb-1">
                          Tipo de cliente
                        </label>
                        <select
                          id="client_type"
                          value={formData.client_type}
                          onChange={(e) => setFormData(prev => ({ ...prev, client_type: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                        >
                          <option value="farmer">Agricultor</option>
                          <option value="agricultural_company">Empresa Agrícola</option>
                          <option value="research_institution">Institución de Investigación</option>
                          <option value="government_agency">Agencia Gubernamental</option>
                          <option value="consultant">Consultor</option>
                        </select>
                      </div>

                      {/* Email */}
                      <div>
                        <label htmlFor="contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                          Email de contacto
                        </label>
                        <input
                          type="email"
                          id="contact_email"
                          value={formData.contact_email}
                          onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="cliente@ejemplo.com"
                        />
                      </div>

                      {/* Phone */}
                      <div>
                        <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
                          Teléfono
                        </label>
                        <input
                          type="tel"
                          id="phone"
                          value={formData.phone}
                          onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="+56 9 1234 5678"
                        />
                      </div>

                      {/* Address */}
                      <div className="sm:col-span-2">
                        <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
                          Dirección
                        </label>
                        <textarea
                          id="address"
                          rows={2}
                          value={formData.address}
                          onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                          placeholder="Dirección completa del cliente"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className="w-full inline-flex justify-center rounded-md border border-transparent shadow-sm px-4 py-2 bg-green-600 text-base font-medium text-white hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 sm:ml-3 sm:w-auto sm:text-sm disabled:opacity-50"
                    >
                      {isSubmitting ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        'Crear cliente'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowAddModal(false)}
                      className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
                    >
                      Cancelar
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </DashboardLayout>
  )
}