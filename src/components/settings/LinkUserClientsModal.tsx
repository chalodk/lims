'use client'

import { useState, useEffect, useCallback } from 'react'
import { Link2, Search, Plus, Trash2, Loader2, Users } from 'lucide-react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { FormSection } from '@/components/ui/form-section'
import { cn } from '@/lib/utils'

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

export default function LinkUserClientsModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: LinkUserClientsModalProps) {
  const [linkedClients, setLinkedClients] = useState<LinkedClient[]>([])
  const [availableClients, setAvailableClients] = useState<Client[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [isDeleting, setIsDeleting] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedClientId, setSelectedClientId] = useState<string>('')

  const supabase = getSupabaseClient()

  const fetchLinkedClients = useCallback(async () => {
    if (!user?.id) return

    try {
      setIsLoading(true)
      setError(null)

      const response = await fetch(`/api/settings/users/${user.id}/clients`)
      const data = await response.json()

      if (!response.ok) {
        const errorMsg = data.details
          ? `${data.error}: ${data.details}${data.code ? ` (code: ${data.code})` : ''}`
          : data.error || 'Error al cargar clientes vinculados'
        throw new Error(errorMsg)
      }

      setLinkedClients(data.clients || [])
    } catch (err) {
      console.error('Error fetching linked clients:', err)
      setError(err instanceof Error ? err.message : 'Error al cargar clientes vinculados')
    } finally {
      setIsLoading(false)
    }
  }, [user?.id])

  const fetchAvailableClients = useCallback(async () => {
    try {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser()
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
          client_id: selectedClientId,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al vincular cliente')
      }

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
        method: 'DELETE',
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al eliminar vínculo')
      }

      await fetchLinkedClients()
      onSuccess()
    } catch (err) {
      console.error('Error unlinking client:', err)
      setError(err instanceof Error ? err.message : 'Error al eliminar vínculo')
    } finally {
      setIsDeleting(null)
    }
  }

  const linkedClientIds = new Set(linkedClients.map((lc) => lc.client_id))
  const filteredAvailableClients = availableClients
    .filter((client) => !linkedClientIds.has(client.id))
    .filter((client) => {
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

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) handleClose()
  }

  const busy = isLinking || !!isDeleting
  const canOpen = isOpen && !!user && user.role === 'consumidor'

  return (
    <Dialog open={canOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!busy}
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (busy) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (busy) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Link2 className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Vincular clientes</DialogTitle>
              <DialogDescription className="mt-1">
                {user?.name} — {user?.email}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
              {error}
            </div>
          ) : null}

          <FormSection
            step={1}
            title="Clientes vinculados"
            description="Clientes actualmente asociados a este usuario"
          >
            {isLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : linkedClients.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-8 text-center">
                <Users className="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
                <p className="text-sm text-muted-foreground">No hay clientes vinculados</p>
                <p className="mt-1 text-xs text-muted-foreground">
                  Selecciona un cliente de la lista para vincularlo
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {linkedClients.map((linkedClient) => (
                  <div
                    key={linkedClient.id}
                    className="flex items-center justify-between rounded-lg border border-green-200 bg-green-50 p-3"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-foreground">
                        {linkedClient.clients.name}
                      </p>
                      {linkedClient.clients.rut ? (
                        <p className="text-xs text-muted-foreground">
                          RUT: {linkedClient.clients.rut}
                        </p>
                      ) : null}
                      {linkedClient.clients.contact_email ? (
                        <p className="text-xs text-muted-foreground">
                          {linkedClient.clients.contact_email}
                        </p>
                      ) : null}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon-sm"
                      onClick={() => handleUnlinkClient(linkedClient.client_id)}
                      disabled={isDeleting === linkedClient.client_id}
                      title="Eliminar vínculo"
                      className="ml-4 text-destructive hover:text-destructive"
                    >
                      {isDeleting === linkedClient.client_id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </FormSection>

          <FormSection
            step={2}
            title="Vincular nuevo cliente"
            description="Busca y selecciona un cliente disponible"
          >
            <div className="relative mb-4">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                type="text"
                placeholder="Buscar cliente por nombre, RUT o email..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            {filteredAvailableClients.length === 0 ? (
              <div className="rounded-lg border border-gray-200 bg-white py-4 text-center">
                <p className="text-sm text-muted-foreground">
                  {searchTerm
                    ? 'No se encontraron clientes'
                    : 'No hay clientes disponibles para vincular'}
                </p>
              </div>
            ) : (
              <div className="mb-4 max-h-48 overflow-y-auto rounded-lg border border-gray-200 bg-white">
                {filteredAvailableClients.map((client) => (
                  <button
                    key={client.id}
                    type="button"
                    onClick={() => setSelectedClientId(client.id)}
                    className={cn(
                      'w-full border-b border-gray-100 p-3 text-left transition-colors last:border-b-0 hover:bg-accent/40',
                      selectedClientId === client.id && 'border-green-200 bg-green-50'
                    )}
                  >
                    <p className="text-sm font-medium text-foreground">{client.name}</p>
                    {client.rut ? (
                      <p className="text-xs text-muted-foreground">RUT: {client.rut}</p>
                    ) : null}
                    {client.contact_email ? (
                      <p className="text-xs text-muted-foreground">{client.contact_email}</p>
                    ) : null}
                  </button>
                ))}
              </div>
            )}

            <Button
              type="button"
              onClick={handleLinkClient}
              disabled={!selectedClientId || isLinking}
              className="w-full gap-2"
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Vinculando...
                </>
              ) : (
                <>
                  <Plus className="h-4 w-4" />
                  Vincular cliente seleccionado
                </>
              )}
            </Button>
          </FormSection>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={busy}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
