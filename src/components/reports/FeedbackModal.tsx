'use client'

import { useState, useEffect } from 'react'
import { useAuth } from '@/hooks/useAuth'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { MessageCircle, Mail, Loader2 } from 'lucide-react'
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

const REQUIREMENT_OPTIONS = [
  { value: 'soporte', label: 'Soporte' },
  { value: 'consultas', label: 'Consultas' },
  { value: 'saber_mas', label: 'Saber más de Agroanalytics' },
]

const WHATSAPP_NUMBER = '56997023645'

interface FeedbackModalProps {
  isOpen: boolean
  onClose: () => void
}

export default function FeedbackModal({ isOpen, onClose }: FeedbackModalProps) {
  const { user } = useAuth()
  const [companyName, setCompanyName] = useState('')
  const [isSending, setIsSending] = useState(false)
  const [sent, setSent] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    requirement: 'soporte',
    analysisType: '',
    message: '',
  })

  useEffect(() => {
    if (isOpen && user) {
      setFormData({
        name: user.name || '',
        email: user.email || '',
        requirement: 'soporte',
        analysisType: '',
        message: '',
      })
      setSent(false)
    }
  }, [isOpen, user])

  useEffect(() => {
    if (isOpen && user?.company_id) {
      const supabase = getSupabaseClient()
      supabase
        .from('companies')
        .select('name')
        .eq('id', user.company_id)
        .single()
        .then(({ data }) => {
          if (data) setCompanyName(data.name)
        })
    }
  }, [isOpen, user?.company_id])

  const handleSend = async () => {
    setIsSending(true)
    try {
      const response = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...formData,
          companyName,
          userId: user?.id,
        }),
      })

      if (!response.ok) {
        const data = await response.json()
        throw new Error(data.error || 'Error al enviar')
      }

      setSent(true)
    } catch (error) {
      console.error('Error sending feedback:', error)
      alert('Error al enviar el feedback. Intenta nuevamente.')
    } finally {
      setIsSending(false)
    }
  }

  const handleWhatsApp = () => {
    const requestLabel = REQUIREMENT_OPTIONS.find(o => o.value === formData.requirement)?.label || formData.requirement
    const text = [
      `Hola Agroanalytics, soy ${formData.name || user?.name || '(sin nombre)'}, usuario de LIMS ${companyName || 'mi empresa'} y necesito ${requestLabel.toLowerCase()}.`,
      formData.analysisType ? `\n*Tipo de análisis:* ${formData.analysisType}` : '',
      formData.message ? `\n*Mensaje:* ${formData.message}` : '',
    ]
      .filter(Boolean)
      .join('')

    window.open(`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(text)}`, '_blank')
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isSending) {
      onClose()
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isSending}
        className="flex max-h-[90vh] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:max-w-lg"
        onInteractOutside={(event) => {
          if (isSending) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isSending) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <MessageCircle className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Enviar feedback</DialogTitle>
              <DialogDescription className="mt-1">
                Déjanos tu consulta o sugerencia
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          <FormSection title="Tus datos" description="Información de contacto">
            <div className="grid grid-cols-1 gap-4">
              <Field label="Nombre">
                <Input
                  id="feedback-name"
                  type="text"
                  value={formData.name}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, name: e.target.value }))
                  }
                  className={fieldClassName}
                  placeholder="Tu nombre"
                />
              </Field>

              <Field label="Correo electrónico">
                <Input
                  id="feedback-email"
                  type="email"
                  value={formData.email}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, email: e.target.value }))
                  }
                  className={fieldClassName}
                  placeholder="tu@correo.com"
                />
              </Field>

              <Field label="Requerimiento">
                <select
                  id="feedback-requirement"
                  value={formData.requirement}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      requirement: e.target.value,
                    }))
                  }
                  className={fieldClassName}
                >
                  {REQUIREMENT_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Tipo de análisis (opcional)">
                <Input
                  id="feedback-analysis-type"
                  type="text"
                  value={formData.analysisType}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      analysisType: e.target.value,
                    }))
                  }
                  className={fieldClassName}
                  placeholder="Ej: Análisis foliar, nematodos..."
                />
              </Field>

              <Field label="Mensaje">
                <textarea
                  id="feedback-message"
                  rows={4}
                  value={formData.message}
                  onChange={(e) =>
                    setFormData((prev) => ({ ...prev, message: e.target.value }))
                  }
                  className={textareaClassName}
                  placeholder="Escribe tu consulta o sugerencia aquí..."
                />
              </Field>
            </div>
          </FormSection>
        </div>

        <DialogFooter className="sm:justify-between">
          <Button
            type="button"
            onClick={handleSend}
            disabled={isSending || sent}
            className="gap-2"
          >
            {isSending ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Mail className="h-4 w-4" />
            )}
            {sent ? 'Enviado' : 'Enviar'}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={handleWhatsApp}
            className="gap-2 border-green-600 text-green-700 hover:bg-green-50 hover:text-green-800"
          >
            <MessageCircle className="h-4 w-4" />
            WhatsApp
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
