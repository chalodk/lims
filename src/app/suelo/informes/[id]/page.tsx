'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Eye, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import SoilReportPreviewDialog from '@/components/soil/SoilReportPreviewDialog'
import { Button } from '@/components/ui/button'
import { useAuth } from '@/hooks/useAuth'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'
import SoilReportPayloadView from '../SoilReportPayloadView'

interface SavedSoilReport {
  id: string
  createdAt: string
  matrixName: string
  payload: SoilReportPayload
  source: 'reports' | 'soil_reports'
  completed: boolean
  renderedPdfUrl: string | null
  downloadUrl: string | null
}

function formatReportDate(value: string): string {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SoilReportDetailPage() {
  const { id: reportId } = useParams<{ id: string }>()
  const { userRole } = useAuth()
  const canValidate = userRole === 'admin' || userRole === 'validador'
  const [report, setReport] = useState<SavedSoilReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)
  const [isValidating, setIsValidating] = useState(false)
  const [previewOpen, setPreviewOpen] = useState(false)
  const [previewLoading, setPreviewLoading] = useState(false)

  useEffect(() => {
    const loadReport = async () => {
      try {
        const response = await fetch(`/api/soil/reports/${reportId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar el informe')
        setReport(data.report)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar el informe')
      }
    }
    void loadReport()
  }, [reportId])

  const ensurePdf = async (): Promise<{ renderedPdfUrl: string | null; downloadUrl: string | null } | null> => {
    if (!report) return null
    const secureUrl = report.renderedPdfUrl?.startsWith('https://') ? report.renderedPdfUrl : null
    if (secureUrl) {
      return { renderedPdfUrl: secureUrl, downloadUrl: report.downloadUrl }
    }
    const response = await fetch(`/api/soil/reports/${report.id}/pdf`, { method: 'POST' })
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'No se pudo generar el PDF')
    const renderedPdfUrl = typeof data.renderedPdfUrl === 'string' ? data.renderedPdfUrl : null
    const downloadUrl = typeof data.downloadUrl === 'string' ? data.downloadUrl : null
    if (report.source === 'reports') {
      setReport({ ...report, renderedPdfUrl, downloadUrl })
    }
    return { renderedPdfUrl, downloadUrl }
  }

  const downloadPdf = async () => {
    if (!report) return
    setActionError(null)
    if (report.downloadUrl) {
      window.open(report.downloadUrl, '_blank', 'noopener,noreferrer')
      return
    }
    if (userRole === 'consumidor') {
      setActionError('El PDF todavía no está listo')
      return
    }
    setIsDownloading(true)
    try {
      const urls = await ensurePdf()
      if (!urls?.downloadUrl) throw new Error('El PDF no tiene enlace de descarga')
      window.open(urls.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (pdfError) {
      setActionError(pdfError instanceof Error ? pdfError.message : 'No se pudo generar el PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  const openPreview = async () => {
    if (!report) return
    setActionError(null)
    setPreviewOpen(true)
    if (report.renderedPdfUrl?.startsWith('https://') || userRole === 'consumidor') return
    setPreviewLoading(true)
    try {
      await ensurePdf()
    } catch (pdfError) {
      setPreviewOpen(false)
      setActionError(pdfError instanceof Error ? pdfError.message : 'No se pudo generar el PDF')
    } finally {
      setPreviewLoading(false)
    }
  }

  const setValidation = async (status: 'validated' | 'draft') => {
    if (!report) return
    setActionError(null)
    setIsValidating(true)
    try {
      const response = await fetch(`/api/soil/reports/${report.id}/validation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la validación')
      setReport({ ...report, completed: data.report?.completed === true })
    } catch (validationError) {
      setActionError(validationError instanceof Error ? validationError.message : 'No se pudo actualizar la validación')
    } finally {
      setIsValidating(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <Link href="/suelo/informes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Informes
        </Link>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : !report ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Informe de {report.matrixName}</h1>
                <p className="text-sm text-muted-foreground">
                  {formatReportDate(report.createdAt)}
                  {report.source === 'reports' ? ` · ${report.completed ? 'Validado' : 'Borrador'}` : ''}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button type="button" variant="outline" onClick={() => void openPreview()} className="gap-1">
                  <Eye className="h-4 w-4" />
                  Ver
                </Button>
                <Button type="button" onClick={() => void downloadPdf()} disabled={isDownloading} className="gap-1">
                  {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                  Descargar PDF
                </Button>
                {canValidate && report.source === 'reports' ? (
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isValidating}
                    onClick={() => void setValidation(report.completed ? 'draft' : 'validated')}
                  >
                    {isValidating ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
                    {report.completed ? 'Quitar validación' : 'Validar'}
                  </Button>
                ) : null}
              </div>
            </div>
            {actionError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
            ) : null}
            <SoilReportPayloadView payload={report.payload} />
            <SoilReportPreviewDialog
              open={previewOpen}
              onOpenChange={setPreviewOpen}
              renderedPdfUrl={report.renderedPdfUrl}
              downloadUrl={report.downloadUrl}
              isLoading={previewLoading}
            />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
