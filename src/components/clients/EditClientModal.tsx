'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { Client } from '@/types/database'
import { 
  Users,
  Loader2,
  X
} from 'lucide-react'

interface EditClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
  client: Client | null
}

export default function EditClientModal({ isOpen, onClose, onSuccess, client }: EditClientModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    contact_email: '',
    phone: '',
    address: '',
    client_type: 'farmer',
    observation: false
  })
  
  const supabase = getSupabaseClient()

  // Load client data when modal opens
  useEffect(() => {
    if (isOpen && client) {
      setFormData({
        name: client.name || '',
        rut: client.rut || '',
        contact_email: client.contact_email || '',
        phone: client.phone || '',
        address: client.address || '',
        client_type: client.client_type || 'farmer',
        observation: client.observation || false
      })
    }
  }, [isOpen, client])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Validation: name is required
    if (!formData.name.trim()) {
      alert('El nombre del cliente es obligatorio')
      return
    }

    setIsSubmitting(true)

    try {
      const { error } = await supabase
        .from('clients')
        .update({
          name: formData.name.trim(),
          rut: formData.rut.trim() || null,
          contact_email: formData.contact_email.trim() || null,
          phone: formData.phone.trim() || null,
          address: formData.address.trim() || null,
          client_type: formData.client_type,
          observation: formData.observation
        })
        .eq('id', client?.id)
        .eq('company_id', user?.company_id) // Additional security: ensure user can only update their company's clients

      if (error) throw error

      onClose()
      
      // Notify parent component to refresh
      onSuccess()
    } catch (error: unknown) {
      console.error('Error updating client:', error)
      const errorMessage = error instanceof Error ? error.message : 'Error desconocido'
      
      // Handle specific database errors
      if (errorMessage.includes('duplicate') || errorMessage.includes('unique')) {
        alert('Error: Ya existe un cliente con estos datos. Por favor, verifica la información.')
      } else if (errorMessage.includes('foreign key') || errorMessage.includes('violates foreign key')) {
        alert('Error: No se puede actualizar el cliente debido a restricciones de integridad de datos.')
      } else {
        alert('Error al actualizar el cliente: ' + errorMessage)
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  if (!isOpen || !client) return null

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
        <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity" onClick={onClose} />
        
        <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-2xl sm:w-full">
          <form onSubmit={handleSubmit}>
            <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
              <div className="sm:flex sm:items-start mb-4">
                <div className="mx-auto flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-full bg-green-100 sm:mx-0 sm:h-10 sm:w-10">
                  <Users className="h-6 w-6 text-green-600" />
                </div>
                <div className="mt-3 text-center sm:mt-0 sm:ml-4 sm:text-left flex-1">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg leading-6 font-medium text-gray-900">
                        Editar Cliente
                      </h3>
                      <div className="mt-2">
                        <p className="text-sm text-gray-500">
                          Modifica la información del cliente
                        </p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={onClose}
                      className="rounded-md text-gray-400 hover:text-gray-600"
                    >
                      <X className="h-6 w-6" />
                    </button>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Name */}
                <div className="sm:col-span-2">
                  <label htmlFor="edit-name" className="block text-sm font-medium text-gray-700 mb-1">
                    Nombre *
                  </label>
                  <input
                    type="text"
                    id="edit-name"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Nombre del cliente"
                  />
                </div>

                {/* RUT */}
                <div>
                  <label htmlFor="edit-rut" className="block text-sm font-medium text-gray-700 mb-1">
                    RUT
                  </label>
                  <input
                    type="text"
                    id="edit-rut"
                    value={formData.rut}
                    onChange={(e) => setFormData(prev => ({ ...prev, rut: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="12.345.678-9"
                  />
                </div>

                {/* Client Type */}
                <div>
                  <label htmlFor="edit-client_type" className="block text-sm font-medium text-gray-700 mb-1">
                    Tipo de cliente
                  </label>
                  <select
                    id="edit-client_type"
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
                  <label htmlFor="edit-contact_email" className="block text-sm font-medium text-gray-700 mb-1">
                    Email de contacto
                  </label>
                  <input
                    type="email"
                    id="edit-contact_email"
                    value={formData.contact_email}
                    onChange={(e) => setFormData(prev => ({ ...prev, contact_email: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="cliente@ejemplo.com"
                  />
                </div>

                {/* Phone */}
                <div>
                  <label htmlFor="edit-phone" className="block text-sm font-medium text-gray-700 mb-1">
                    Teléfono
                  </label>
                  <input
                    type="tel"
                    id="edit-phone"
                    value={formData.phone}
                    onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="+56 9 1234 5678"
                  />
                </div>

                {/* Address */}
                <div className="sm:col-span-2">
                  <label htmlFor="edit-address" className="block text-sm font-medium text-gray-700 mb-1">
                    Dirección
                  </label>
                  <textarea
                    id="edit-address"
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData(prev => ({ ...prev, address: e.target.value }))}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
                    placeholder="Dirección completa del cliente"
                  />
                </div>

                {/* Observation Checkbox */}
                <div className="sm:col-span-2">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit-observation"
                      checked={formData.observation}
                      onChange={(e) => setFormData(prev => ({ ...prev, observation: e.target.checked }))}
                      className="h-4 w-4 text-green-600 focus:ring-green-500 border-gray-300 rounded"
                    />
                    <label htmlFor="edit-observation" className="ml-2 block text-sm font-medium text-gray-700">
                      En observación
                    </label>
                  </div>
                  <p className="ml-6 mt-1 text-xs text-gray-500">
                    Marca esta opción si el cliente está en observación
                  </p>
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
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Guardando...
                  </>
                ) : (
                  'Guardar cambios'
                )}
              </button>
              <button
                type="button"
                onClick={onClose}
                className="mt-3 w-full inline-flex justify-center rounded-md border border-gray-300 shadow-sm px-4 py-2 bg-white text-base font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 sm:mt-0 sm:ml-3 sm:w-auto sm:text-sm"
              >
                Cancelar
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  )
}

