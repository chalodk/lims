'use client'

import { useState, useEffect } from 'react'
import { User, Loader2 } from 'lucide-react'
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
import { fieldClassName } from '@/components/ui/form-field-styles'

interface UserProfile {
  id: string
  name: string
  email: string
  role: string
  role_id?: number | null
  created_at: string
  isUnauthorized?: boolean
}

interface Role {
  id: number
  name: string
}

interface EditProfileModalProps {
  isOpen: boolean
  onClose: () => void
  user: UserProfile | null
  onSuccess: () => void
}

export default function EditProfileModal({
  isOpen,
  onClose,
  user,
  onSuccess,
}: EditProfileModalProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [roles, setRoles] = useState<Role[]>([])
  const [loadingRoles, setLoadingRoles] = useState(true)

  const [formData, setFormData] = useState({
    name: '',
    role_id: '' as string | number | null,
  })

  useEffect(() => {
    if (!isOpen || !user) return

    const loadData = async () => {
      try {
        setLoadingRoles(true)
        setError(null)

        let actualRoleId: number | null = null

        try {
          const userResponse = await fetch(`/api/settings/users/${user.id}/role`)
          if (userResponse.ok) {
            const userData = await userResponse.json()
            actualRoleId = userData.role_id || null
          }
        } catch (err) {
          console.error('Error al obtener role_id del usuario:', err)
        }

        if (actualRoleId === null && user.role_id !== null && user.role_id !== undefined) {
          actualRoleId = user.role_id
        }

        const response = await fetch('/api/settings/roles')
        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.error || 'Error al cargar roles')
        }

        const loadedRoles = data.roles || []
        setRoles(loadedRoles)

        if (
          actualRoleId === null &&
          user.role &&
          user.role !== 'Sin rol' &&
          user.role !== 'Sin autorizar'
        ) {
          const roleNameMap: Record<string, string> = {
            Administrador: 'admin',
            admin: 'admin',
            Validador: 'validador',
            validador: 'validador',
            Común: 'comun',
            comun: 'comun',
            Consumidor: 'consumidor',
            consumidor: 'consumidor',
          }

          const roleNameInDB = roleNameMap[user.role] || user.role.toLowerCase()
          const role = loadedRoles.find((r: Role) => r.name === roleNameInDB)
          if (role) {
            actualRoleId = role.id
          }
        }

        setFormData({
          name: user.name || '',
          role_id: actualRoleId,
        })
      } catch (err) {
        console.error('Error al cargar datos:', err)
        setError(err instanceof Error ? err.message : 'Error al cargar datos')
      } finally {
        setLoadingRoles(false)
      }
    }

    loadData()
  }, [user, isOpen])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!user) return

    setIsSubmitting(true)
    setError(null)

    try {
      const response = await fetch(`/api/settings/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name,
          role_id: formData.role_id ? parseInt(formData.role_id.toString()) : null,
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar perfil')
      }

      onSuccess()
      onClose()
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar perfil')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose()
  }

  return (
    <Dialog open={isOpen && !!user} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isSubmitting}
        className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
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
              <User className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>
                {user?.isUnauthorized ? 'Autorizar usuario' : 'Editar perfil'}
              </DialogTitle>
              <DialogDescription className="mt-1">
                {user?.isUnauthorized
                  ? 'Completa el perfil y asigna un rol al usuario'
                  : 'Modifica los datos del perfil y asigna un rol'}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            {error ? (
              <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-800">
                {error}
              </div>
            ) : null}

            <FormSection
              step={1}
              title="Cuenta"
              description="Nombre del usuario en el sistema"
            >
              <Field label="Nombre" required>
                <Input
                  type="text"
                  required
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className={fieldClassName}
                  placeholder="Nombre del usuario"
                  disabled={isSubmitting}
                />
              </Field>
            </FormSection>

            <FormSection
              step={2}
              title="Rol"
              description="Selecciona un rol para asignar permisos al usuario"
            >
              {loadingRoles ? (
                <div className="flex items-center justify-center py-2">
                  <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                  <span className="ml-2 text-sm text-muted-foreground">Cargando roles...</span>
                </div>
              ) : (
                <Field label="Rol">
                  <select
                    value={
                      formData.role_id !== null && formData.role_id !== undefined
                        ? formData.role_id
                        : ''
                    }
                    onChange={(e) =>
                      setFormData({
                        ...formData,
                        role_id: e.target.value ? parseInt(e.target.value) : null,
                      })
                    }
                    className={fieldClassName}
                    disabled={isSubmitting}
                  >
                    <option value="">Sin rol</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.id}>
                        {role.name === 'admin'
                          ? 'Administrador'
                          : role.name === 'validador'
                            ? 'Validador'
                            : role.name === 'comun'
                              ? 'Común'
                              : role.name === 'consumidor'
                                ? 'Consumidor'
                                : role.name}
                      </option>
                    ))}
                  </select>
                </Field>
              )}
            </FormSection>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || loadingRoles}
              className="gap-2"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                'Guardar cambios'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
