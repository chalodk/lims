'use client'

import { useState } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { FolderOpen, Loader2 } from 'lucide-react'
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

interface CreateProjectModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: (projectId?: string) => void
}

export default function CreateProjectModal({
  isOpen,
  onClose,
  onSuccess,
}: CreateProjectModalProps) {
  const { user } = useAuth()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    code: '',
    start_date: '',
    end_date: '',
    notes: '',
  })

  const supabase = getSupabaseClient()

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isSubmitting) onClose()
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      const { error } = await supabase.from('projects').insert([
        {
          name: formData.name,
          code: formData.code || null,
          start_date: formData.start_date || null,
          end_date: formData.end_date || null,
          notes: formData.notes || null,
          company_id: user?.company_id || null,
        },
      ])

      if (error) throw error

      const { data: createdProject, error: fetchError } = await supabase
        .from('projects')
        .select('id')
        .eq('name', formData.name)
        .eq('company_id', user?.company_id || null)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (fetchError) {
        console.error('Error fetching created project:', fetchError)
      }

      setFormData({
        name: '',
        code: '',
        start_date: '',
        end_date: '',
        notes: '',
      })
      onClose()
      onSuccess(createdProject?.id)
    } catch (error: unknown) {
      console.error('Error creating project:', error)
      alert(
        'Error al crear el proyecto: ' +
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
              <FolderOpen className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Nuevo proyecto</DialogTitle>
              <DialogDescription className="mt-1">
                Agrega un nuevo proyecto al sistema
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
            <FormSection
              step={1}
              title="Identidad"
              description="Nombre y código del proyecto"
            >
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Nombre" required className="sm:col-span-2">
                  <Input
                    type="text"
                    required
                    value={formData.name}
                    onChange={(e) => setFormData((prev) => ({ ...prev, name: e.target.value }))}
                    className={fieldClassName}
                    placeholder="Nombre del proyecto"
                  />
                </Field>

                <Field label="Código" className="sm:col-span-2">
                  <Input
                    type="text"
                    value={formData.code}
                    onChange={(e) => setFormData((prev) => ({ ...prev, code: e.target.value }))}
                    className={fieldClassName}
                    placeholder="Código del proyecto"
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection step={2} title="Plazo" description="Fechas opcionales del proyecto">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <Field label="Fecha de inicio">
                  <Input
                    type="date"
                    value={formData.start_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, start_date: e.target.value }))
                    }
                    className={fieldClassName}
                  />
                </Field>

                <Field label="Fecha de fin">
                  <Input
                    type="date"
                    value={formData.end_date}
                    onChange={(e) =>
                      setFormData((prev) => ({ ...prev, end_date: e.target.value }))
                    }
                    className={fieldClassName}
                  />
                </Field>
              </div>
            </FormSection>

            <FormSection step={3} title="Notas" description="Contexto adicional opcional">
              <Field label="Notas">
                <textarea
                  rows={3}
                  value={formData.notes}
                  onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
                  className={textareaClassName}
                  placeholder="Notas adicionales sobre el proyecto"
                />
              </Field>
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
                'Crear proyecto'
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
