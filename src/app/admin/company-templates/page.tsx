'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Loader2, Save, Trash2, Building2, Eye } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { fieldClassName } from '@/components/ui/form-field-styles'

interface Company {
  id: string
  name: string
}

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

export default function CompanyTemplatesPage() {
  const router = useRouter()
  const { userRole, isAuthenticated, isLoading: authLoading } = useAuth()

  const [companies, setCompanies] = useState<Company[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string>('')
  const [analysisTypes, setAnalysisTypes] = useState<AnalysisType[]>([])
  const [templates, setTemplates] = useState<CompanyTemplate[]>([])
  const [formValues, setFormValues] = useState<Record<string, string>>({})
  const [isLoadingCompanies, setIsLoadingCompanies] = useState(false)
  const [isLoadingData, setIsLoadingData] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [successMsg, setSuccessMsg] = useState<string | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)
  const [isLoadingPreview, setIsLoadingPreview] = useState(false)

  const fetchCompanies = useCallback(async () => {
    setIsLoadingCompanies(true)
    try {
      const res = await fetch('/api/admin/companies')
      if (res.ok) {
        const data = await res.json()
        setCompanies(data.companies || [])
      } else {
        console.error('Error fetching companies:', res.status, await res.text())
        setError('Error al cargar empresas')
      }
    } catch (e) {
      console.error('Error fetching companies:', e)
      setError('Error al cargar empresas')
    } finally {
      setIsLoadingCompanies(false)
    }
  }, [])

  const fetchCompanyData = useCallback(async (companyId: string) => {
    setIsLoadingData(true)
    setError(null)
    try {
      const [typesRes, templatesRes] = await Promise.all([
        fetch('/api/admin/analysis-types'),
        fetch(`/api/admin/company-templates?company_id=${companyId}`),
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
        setError('No tienes permisos para ver templates de esta empresa')
      }
    } catch {
      setError('Error al cargar datos')
    } finally {
      setIsLoadingData(false)
    }
  }, [])

  useEffect(() => {
    if (!authLoading && isAuthenticated && (userRole === 'csx' || userRole === 'admin')) {
      fetchCompanies()
    }
  }, [authLoading, isAuthenticated, userRole, fetchCompanies])

  useEffect(() => {
    if (selectedCompanyId) {
      fetchCompanyData(selectedCompanyId)
    } else {
      setAnalysisTypes([])
      setTemplates([])
      setFormValues({})
    }
  }, [selectedCompanyId, fetchCompanyData])

  const handleSave = async (analysisTypeKey: string) => {
    const templateId = formValues[analysisTypeKey]?.trim()
    if (!templateId || !selectedCompanyId) return

    setIsSaving(true)
    setError(null)
    setSuccessMsg(null)
    try {
      const res = await fetch('/api/admin/company-templates', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          company_id: selectedCompanyId,
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

  const handlePreview = async (templateId: string) => {
    setIsLoadingPreview(true)
    try {
      const res = await fetch(`/api/admin/templates/preview?template_id=${templateId}`)
      if (res.ok) {
        const data = await res.json()
        if (data.preview_url) {
          setPreviewUrl(data.preview_url)
          setIsPreviewOpen(true)
        } else {
          setError('No se pudo obtener la previsualizacion')
        }
      } else {
        const err = await res.json()
        setError(err.error || 'Error al obtener previsualizacion')
      }
    } catch {
      setError('Error al obtener previsualizacion')
    } finally {
      setIsLoadingPreview(false)
    }
  }

  if (authLoading) {
    return (
      <DashboardLayout>
        <div className="min-h-screen flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-green-600" />
        </div>
      </DashboardLayout>
    )
  }

  if (!isAuthenticated) {
    router.replace('/login')
    return null
  }

  if (userRole !== 'csx' && userRole !== 'admin') {
    router.replace('/dashboard')
    return null
  }

  const selectedCompany = companies.find((c) => c.id === selectedCompanyId)

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">
            Templates PDF por empresa
          </h1>
          <p className="text-sm text-muted-foreground">
            Gestiona los templates PDFMonkey para cada tipo de análisis por empresa.
          </p>
        </div>

        <Card>
          <CardHeader className="border-b border-gray-100">
            <CardTitle className="text-base">Seleccionar empresa</CardTitle>
            <CardDescription>Elige la compañía cuyos templates deseas editar</CardDescription>
          </CardHeader>
          <CardContent className="p-4">
            {isLoadingCompanies ? (
              <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className={`${fieldClassName} md:w-96`}
              >
                <option value="">-- Seleccionar empresa --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </CardContent>
        </Card>

        {selectedCompanyId ? (
          <Card>
            <CardHeader className="border-b border-gray-100">
              <CardTitle className="flex items-center gap-2 text-base">
                <Building2 className="h-4 w-4 text-green-700" />
                {selectedCompany?.name || 'Empresa seleccionada'}
              </CardTitle>
              <CardDescription>
                Personaliza los templates PDFMonkey para cada tipo de análisis.
              </CardDescription>
            </CardHeader>

            <CardContent className="space-y-4 p-4">
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

              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : analysisTypes.length === 0 ? (
                <div className="py-12 text-center text-muted-foreground">
                  No hay tipos de análisis disponibles.
                </div>
              ) : (
                <div className="space-y-4">
                  {analysisTypes
                    .filter((t) => t.key !== 'default')
                    .map((type) => {
                      const currentValue = formValues[type.key] || ''
                      const existingTemplate = templates.find(
                        (t) => t.analysis_type_key === type.key
                      )

                      return (
                        <div key={type.key} className="rounded-lg border border-gray-200 p-4">
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
                                setFormValues((prev) => ({
                                  ...prev,
                                  [type.key]: e.target.value,
                                }))
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
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                handlePreview(
                                  formValues[type.key]?.trim() ||
                                    existingTemplate?.pdfmonkey_template_id ||
                                    ''
                                )
                              }
                              disabled={
                                isLoadingPreview ||
                                (!formValues[type.key]?.trim() &&
                                  !existingTemplate?.pdfmonkey_template_id)
                              }
                              title="Previsualizar template"
                            >
                              {isLoadingPreview ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
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
              )}
            </CardContent>
          </Card>
        ) : null}

        <Dialog
          open={isPreviewOpen && !!previewUrl}
          onOpenChange={(open) => {
            if (!open) {
              setIsPreviewOpen(false)
              setPreviewUrl(null)
            }
          }}
        >
          <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
            <DialogHeader className="border-b border-gray-100">
              <DialogTitle>Previsualización del template</DialogTitle>
            </DialogHeader>
            <div className="p-4" style={{ height: '70vh' }}>
              {previewUrl ? (
                <iframe
                  src={previewUrl}
                  className="h-full w-full rounded border border-gray-200"
                  title="Template Preview"
                />
              ) : null}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </DashboardLayout>
  )

}
