'use client'

import { useState } from 'react'
import { Users, Loader2 } from 'lucide-react'
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
import { FormSection, Field } from '@/components/ui/form-section'
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'

interface CreateClientModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (clientId?: string) => void
}

export default function CreateClientModal({ isOpen, onClose, onSuccess }: CreateClientModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    rut: '',
    contact_email: '',
    phone: '',
    address: '',
    client_type: 'farmer',
    observation: false,
  })

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      if (!formData.rut || !formData.rut.trim()) {
        alert('El RUT es requerido para crear el cliente')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/clients', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          rut: formData.rut,
          contact_email: formData.contact_email || null,
          phone: formData.phone || null,
          address: formData.address || null,
          client_type: formData.client_type,
          observation: formData.observation,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al crear el cliente')
      }

      if (data.password) {
        const passwordMsg = `Cliente y usuario consumidor creados exitosamente.\n\nEmail: ${formData.contact_email}\nContraseña: ${data.password}\n\n${data.warning ? '⚠️ ' + data.warning + '\n\n' : ''}Comparte estas credenciales con el cliente de forma segura.`
        alert(passwordMsg)
      } else if (data.warning) {
        alert('⚠️ ' + data.warning)
      }

      setFormData({
        name: '',
        rut: '',
        contact_email: '',
        phone: '',
        address: '',
        client_type: 'farmer',
        observation: false,
      })
      onClose()
      onSuccess(data.client?.id)
    } catch (error: unknown) {
      console.error('Error creating client:', error)
      alert(
        'Error al crear el cliente: ' +
          (error instanceof Error ? error.message : 'Error desconocido')
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (isSubmitting) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isSubmitting) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <Users className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Nuevo cliente</DialogTitle>
              <DialogDescription className="mt-1">
                Agrega un nuevo cliente al sistema. Los campos con * son obligatorios.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            <FormSection
              step={1}
              title="Identidad"
              description="Nombre legal y RUT del cliente"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre" required className="sm:col-span-2">
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={fieldClassName}
                    placeholder="Nombre del cliente"
                  />
                </Field>

                <Field label="RUT" required className="sm:col-span-2">
                  <Input
                    type="text"
                    required
                    value={formData.rut}
                    onChange={(e) => setFormData((prev) => ({ ...prev, rut: e.target.value }))}
                    className={fieldClassName}
                    placeholder="12.345.678-9"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si se proporciona email, se creará automáticamente un usuario consumidor. La
                    contraseña se genera desde el RUT (sin puntos ni dígito verificador). Si el RUT
                    tiene menos de 8 dígitos se genera una contraseña aleatoria.
                  </p>
                </Field>
              </div>
            </FormSection>

            <FormSection
              step={2}
              title="Contacto"
              description="Datos para comunicación y acceso al portal"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Email de contacto">
                  <Input
                    type="email"
                    value={formData.contact_email}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, contact_email: e.target.value }))
                    }
                    className={fieldClassName}
                    placeholder="cliente@ejemplo.com"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Si se proporciona, se creará automáticamente un usuario consumidor asociado a
                    este cliente
                  </p>
                </Field>

                <Field label="Teléfono">
                  <Input
                    type="tel"
                    value={formData.phone}
                    onChange={(e) => setFormData((prev) => ({ ...prev, phone: e.target.value }))}
                    className={fieldClassName}
                    placeholder="+56 9 1234 5678"
                  />
                </Field>

                <Field label="Dirección" className="sm:col-span-2">
                  <textarea
                    rows={2}
                    value={formData.address}
                    onChange={(e) => setFormData((prev) => ({ ...prev, address: e.target.value }))}
                    className={textareaClassName}
                    placeholder="Dirección completa del cliente"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection
              step={3}
              title="Clasificación"
              description="Tipo de cliente y estado de seguimiento"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Tipo de cliente">
                  <select
                    value={formData.client_type}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, client_type: e.target.value }))
                    }
                    className={fieldClassName}
                  >
                    <option value="farmer">Agricultor</option>
                    <option value="agricultural_company">Empresa Agrícola</option>
                    <option value="research_institution">Institución de Investigación</option>
                    <option value="government_agency">Agencia Gubernamental</option>
                    <option value="consultant">Consultor</option>
                  </select>
                </Field>

                <div className="flex items-start gap-3 sm:col-span-2">
                  <input
                    type="checkbox"
                    id="observation"
                    checked={formData.observation}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, observation: e.target.checked }))
                    }
                    className="mt-0.5 h-4 w-4 rounded border-gray-300 text-green-600 focus-visible:ring-2 focus-visible:ring-green-600/20"
                  />
                  <div>
                    <label htmlFor="observation" className="text-sm font-medium text-gray-700">
                      En observación
                    </label>
                    <p className="mt-0.5 text-xs text-muted-foreground">
                      Marca esta opción si el cliente está en observación
                    </p>
                  </div>
                </div>
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              disabled={isSubmitting}
              onClick={onClose}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting} className="gap-2">
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Creando...
                </>
              ) : (
                'Crear cliente'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
