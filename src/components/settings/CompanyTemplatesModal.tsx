'use client'

import { useState, useEffect, useCallback } from 'react'
import { FileText, Loader2, Save, Trash2 } from 'lucide-react'
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
import { fieldClassName } from '@/components/ui/form-field-styles'

interface AnalysisType {
  id: string
  key: string
  label: string
  initial: string
  bg_color: string
  text_color: string
}

interface CompanyTemplate {
  id: string
  company_id: string
  analysis_type_key: string
  pdfmonkey_template_id: string
}

interface CompanyTemplatesModalProps {
  isOpen: boolean
  onClose: () => void
  onSuccess: () => void
}

export default function CompanyTemplatesModal({
  isOpen,
  onClose,
  onSuccess,
}: CompanyTemplatesModalProps) {
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([])
  const [templates, setTemplates] = useState<CompanyTemplate[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)

  const [formValues, setFormValues] = useState<Record<string, string>>({})

  const fetchData = useCallback(async () => {
    setIsLoading(true)
    setError(null)
    try {
      const [typesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/analysis-types'),
        fetch('/api/admin/company-templates'),
      ])

      if (typesRes.ok) {
        const typesData = await typesRes.json()
        const activeTypes = (typesData.analysis_types || []).filter(
          (t: { active?: boolean }) => t.active !== false
        )
        setAnalysisTypes(activeTypes)
      }

      if (templatesRes.ok) {
        const templatesData = await templatesRes.json()
        const tmpls = templatesData.templates || []
        setTemplates(tmpls)
        const initial: Record<string, string> = {}
        for (const t of tmpls) {
          initial[t.analysis_type_key] = t.pdfmonkey_template_id
        }
        setFormValues(initial)
      } else if (templatesRes.status === 403) {
        setError('No tienes permisos para gestionar templates')
      }
    } catch {
      setError('Error al cargar datos')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    if (isOpen) {
      fetchData()
      setSuccessMsg(null)
    }
  }, [isOpen, fetchData])

  const handleSave = async (analysisTypeKey: string) => {
    const templateId = formValues[analysisTypeKey]?.trim()
    if (!templateId) return

    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/admin/company-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          analysis_type_key: analysisTypeKey,
          pdfmonkey_template_id: templateId,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        setTemplates((prev) => {
          const filtered = prev.filter((t) => t.analysis_type_key !== analysisTypeKey)
          return [...filtered, data.template]
        })
        setSuccessMsg('Template guardado correctamente')
        setTimeout(() => setSuccessMsg(null), 3000)
        onSuccess()
      } else {
        const err = await res.json()
        setError(err.error || 'Error al guardar template')
      }
    } catch {
      setError('Error al guardar template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async (templateId: string, analysisTypeKey: string) => {
    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch(`/api/admin/company-templates/${templateId}`, {
        method: 'DELETE',
      })

      if (res.ok) {
        setTemplates((prev) => prev.filter((t) => t.id !== templateId))
        setFormValues((prev) => {
          const next = { ...prev }
          delete next[analysisTypeKey]
          return next
        })
        setSuccessMsg('Template eliminado. Se usara el template global.')
        setTimeout(() => setSuccessMsg(null), 3000)
        onSuccess()
      } else {
        const err = await res.json()
        setError(err.error || 'Error al eliminar template')
      }
    } catch {
      setError('Error al eliminar template')
    } finally {
      setIsSaving(false)
    }
  }

  const handleClose = () => {
    if (isSaving) return
    onClose()
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) handleClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isSaving}
        className="flex max-h-[90vh] max-w-2xl flex-col gap-0 overflow-hidden p-0 sm:max-w-2xl"
        onInteractOutside={(event) => {
          if (isSaving) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isSaving) event.preventDefault()
        }}
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
              <FileText className="h-5 w-5 text-green-700" />
            </div>
            <div>
              <DialogTitle>Templates PDFMonkey por empresa</DialogTitle>
              <DialogDescription className="mt-1">
                Personaliza los templates PDFMonkey para cada tipo de análisis. Los cambios
                sobreescriben el template global.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          {error ? (
            <div className="rounded-lg border border-red-200 bg-red-50 p-3">
              <p className="text-sm text-red-700">{error}</p>
            </div>
          ) : null}

          {successMsg ? (
            <div className="rounded-lg border border-green-200 bg-green-50 p-3">
              <p className="text-sm text-green-700">{successMsg}</p>
            </div>
          ) : null}

          {isLoading ? (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-green-600" />
            </div>
          ) : (
            <FormSection
              title="Templates por tipo"
              description="Guarda un ID de template PDFMonkey por análisis"
            >
              <div className="space-y-4">
                {analysisTypes
                  .filter((t) => t.key !== 'default')
                  .map((type) => {
                    const currentValue = formValues[type.key] || ''
                    const existingTemplate = templates.find(
                      (t) => t.analysis_type_key === type.key
                    )

                    return (
                      <div
                        key={type.key}
                        className="rounded-lg border border-gray-200 bg-white p-4"
                      >
                        <div className="mb-2 flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span
                              className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-xs font-medium ${type.bg_color} ${type.text_color}`}
                            >
                              {type.initial}
                            </span>
                            <span className="text-sm font-medium text-foreground">
                              {type.label}
                            </span>
                            <span className="text-xs text-muted-foreground">({type.key})</span>
                          </div>
                          {existingTemplate ? (
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              onClick={() => handleDelete(existingTemplate.id, type.key)}
                              disabled={isSaving}
                              title="Eliminar template personalizado"
                              className="text-destructive hover:text-destructive"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          ) : null}
                        </div>
                        <div className="flex items-center gap-2">
                          <Input
                            type="text"
                            value={currentValue}
                            onChange={(e) =>
                              setFormValues((prev) => ({ ...prev, [type.key]: e.target.value }))
                            }
                            placeholder={
                              existingTemplate
                                ? 'Template ID personalizado'
                                : 'Sin template personalizado (usa global)'
                            }
                            className={`flex-1 ${fieldClassName}`}
                          />
                          <Button
                            type="button"
                            onClick={() => handleSave(type.key)}
                            disabled={isSaving || !formValues[type.key]?.trim()}
                            size="icon"
                          >
                            {isSaving ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Save className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        {existingTemplate ? (
                          <p className="mt-1 text-xs text-green-700">
                            Template personalizado: {existingTemplate.pdfmonkey_template_id}
                          </p>
                        ) : null}
                      </div>
                    )
                  })}
              </div>
            </FormSection>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={handleClose} disabled={isSaving}>
            Cerrar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
