'use client'

import { useState, useEffect } from 'react'
import { User, Lock, Eye, EyeOff, Loader2 } from 'lucide-react'
import { useAuth } from '@/hooks/useAuth'
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

interface EditAccountModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function EditAccountModal({ isOpen, onClose, onSuccess }: EditAccountModalProps) {
  const { user, authUser } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [showCurrentPassword, setShowCurrentPassword] = useState(false)
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    name: user?.name || '',
    currentPassword: '',
    newPassword: '',
    confirmPassword: '',
  })

  useEffect(() => {
    if (user) {
      setFormData((prev) => ({
        ...prev,
        name: user.name || '',
      }))
    }
  }, [user])

  const handleClose = () => {
    if (!isSubmitting) {
      setFormData({
        name: user?.name || '',
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      })
      setError(null)
      setSuccess(false)
      onClose()
    }
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) handleClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)
    setError(null)
    setSuccess(false)

    try {
      const isChangingPassword =
        formData.newPassword.trim() !== '' ||
        formData.confirmPassword.trim() !== '' ||
        formData.currentPassword.trim() !== ''

      if (isChangingPassword) {
        if (!formData.currentPassword.trim()) {
          setError('Debes ingresar tu contraseña actual para cambiarla')
          setIsSubmitting(false)
          return
        }
        if (!formData.newPassword.trim()) {
          setError('Debes ingresar una nueva contraseña')
          setIsSubmitting(false)
          return
        }
        if (formData.newPassword.length < 6) {
          setError('La nueva contraseña debe tener al menos 6 caracteres')
          setIsSubmitting(false)
          return
        }
        if (formData.newPassword !== formData.confirmPassword) {
          setError('Las contraseñas no coinciden')
          setIsSubmitting(false)
          return
        }
        if (formData.currentPassword === formData.newPassword) {
          setError('La nueva contraseña debe ser diferente a la actual')
          setIsSubmitting(false)
          return
        }
      }

      if (!formData.name.trim()) {
        setError('El nombre es obligatorio')
        setIsSubmitting(false)
        return
      }

      const response = await fetch('/api/auth/user', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          name: formData.name.trim(),
          ...(isChangingPassword && {
            currentPassword: formData.currentPassword,
            newPassword: formData.newPassword,
          }),
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Error al actualizar la cuenta')
      }

      setSuccess(true)
      setFormData((prev) => ({
        ...prev,
        currentPassword: '',
        newPassword: '',
        confirmPassword: '',
      }))

      setTimeout(() => {
        onSuccess()
        onClose()
        setSuccess(false)
      }, 2000)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error al actualizar la cuenta')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
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
              <DialogTitle>Mi cuenta</DialogTitle>
              <DialogDescription className="mt-1">
                Actualiza tu información personal y contraseña
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

            {success ? (
              <div className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-800">
                ¡Cuenta actualizada exitosamente!
              </div>
            ) : null}

            <FormSection
              step={1}
              title="Perfil"
              description="Datos básicos de tu cuenta"
            >
              <div className="space-y-4">
                <Field label="Correo electrónico">
                  <Input
                    type="email"
                    value={authUser?.email || ''}
                    disabled
                    className={fieldClassName}
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    El correo electrónico no se puede modificar
                  </p>
                </Field>

                <Field label="Nombre" required>
                  <div className="relative">
                    <User className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type="text"
                      required
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      className={`${fieldClassName} pl-10`}
                      placeholder="Tu nombre completo"
                      disabled={isSubmitting}
                    />
                  </div>
                </Field>
              </div>
            </FormSection>

            <FormSection
              step={2}
              title="Cambiar contraseña"
              description="Deja estos campos vacíos si no deseas cambiar tu contraseña"
            >
              <div className="space-y-4">
                <Field label="Contraseña actual">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showCurrentPassword ? 'text' : 'password'}
                      value={formData.currentPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, currentPassword: e.target.value })
                      }
                      className={`${fieldClassName} pl-10 pr-10`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      {showCurrentPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>

                <Field label="Nueva contraseña">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showNewPassword ? 'text' : 'password'}
                      value={formData.newPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, newPassword: e.target.value })
                      }
                      className={`${fieldClassName} pl-10 pr-10`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewPassword(!showNewPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      {showNewPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">Mínimo 6 caracteres</p>
                </Field>

                <Field label="Confirmar nueva contraseña">
                  <div className="relative">
                    <Lock className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={formData.confirmPassword}
                      onChange={(e) =>
                        setFormData({ ...formData, confirmPassword: e.target.value })
                      }
                      className={`${fieldClassName} pl-10 pr-10`}
                      placeholder="••••••••"
                      disabled={isSubmitting}
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                      disabled={isSubmitting}
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </Field>
              </div>
            </FormSection>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={handleClose}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isSubmitting || success} className="gap-2">
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
