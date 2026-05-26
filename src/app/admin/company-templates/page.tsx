'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { FileText, Loader2, Save, Trash2, Building2, Eye, X } from 'lucide-react'

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
      <div className="p-6">
        <div className="mb-8">
          <div className="flex items-center space-x-3 mb-2">
            <FileText className="h-8 w-8 text-green-600" />
            <h1 className="text-3xl font-bold text-gray-900">Templates PDF por Empresa</h1>
          </div>
          <p className="text-gray-600">
            Gestiona los templates PDFMonkey para cada tipo de analisis por empresa.
          </p>
        </div>

        {/* Company Selector */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 mb-6">
          <div className="p-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Seleccionar Empresa
            </label>
            {isLoadingCompanies ? (
              <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
            ) : (
              <select
                value={selectedCompanyId}
                onChange={(e) => setSelectedCompanyId(e.target.value)}
                className="w-full md:w-96 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-green-500"
              >
                <option value="">-- Seleccionar empresa --</option>
                {companies.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* Templates Editor */}
        {selectedCompanyId && (
          <div className="bg-white rounded-lg shadow-sm border border-gray-200">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center space-x-3">
                <Building2 className="h-6 w-6 text-green-600" />
                <h2 className="text-xl font-semibold text-gray-900">
                  {selectedCompany?.name || 'Empresa seleccionada'}
                </h2>
              </div>
              <p className="text-sm text-gray-500 mt-1">
                Personaliza los templates PDFMonkey para cada tipo de analisis.
              </p>
            </div>

            <div className="p-6">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-md">
                  <p className="text-sm text-red-700">{error}</p>
                </div>
              )}

              {successMsg && (
                <div className="mb-4 p-3 bg-green-50 border border-green-200 rounded-md">
                  <p className="text-sm text-green-700">{successMsg}</p>
                </div>
              )}

              {isLoadingData ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
              ) : analysisTypes.length === 0 ? (
                <div className="text-center py-12 text-gray-500">
                  No hay tipos de analisis disponibles.
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
                        <div key={type.key} className="border border-gray-200 rounded-lg p-4">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center space-x-2">
                              <span
                                className={`inline-flex items-center justify-center w-6 h-6 rounded-full text-xs font-medium ${type.bg_color} ${type.text_color}`}
                              >
                                {type.initial}
                              </span>
                              <span className="text-sm font-medium text-gray-900">
                                {type.label}
                              </span>
                              <span className="text-xs text-gray-500">({type.key})</span>
                            </div>
                            {existingTemplate && (
                              <button
                                type="button"
                                onClick={() => handleDelete(existingTemplate.id, type.key)}
                                disabled={isSaving}
                                className="text-red-400 hover:text-red-600 disabled:opacity-50"
                                title="Eliminar template personalizado"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                          <div className="flex items-center space-x-2">
                            <input
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
                              className="flex-1 px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                            />
                            <button
                              type="button"
                              onClick={() => handleSave(type.key)}
                              disabled={isSaving || !formValues[type.key]?.trim()}
                              className="inline-flex items-center px-3 py-2 border border-transparent text-sm font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500 disabled:opacity-50"
                            >
                              {isSaving ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Save className="h-4 w-4" />
                              )}
                            </button>
                            <button
                              type="button"
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
                              className="inline-flex items-center px-3 py-2 border border-gray-300 text-sm font-medium rounded-md shadow-sm text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-50"
                              title="Previsualizar template"
                            >
                              {isLoadingPreview ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <Eye className="h-4 w-4" />
                              )}
                            </button>
                          </div>
                          {existingTemplate && (
                            <p className="text-xs text-green-600 mt-1">
                              Template personalizado: {existingTemplate.pdfmonkey_template_id}
                            </p>
                          )}
                        </div>
                      )
                    })}
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Preview Modal */}
      {isPreviewOpen && previewUrl && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div
              className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"
              onClick={() => {
                setIsPreviewOpen(false)
                setPreviewUrl(null)
              }}
            />

            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Previsualizacion del Template
                  </h3>
                  <button
                    onClick={() => {
                      setIsPreviewOpen(false)
                      setPreviewUrl(null)
                    }}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>
                <div className="w-full" style={{ height: '70vh' }}>
                  <iframe
                    src={previewUrl}
                    className="w-full h-full border border-gray-200 rounded"
                    title="Template Preview"
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
