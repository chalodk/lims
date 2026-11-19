'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Download, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'
import SoilReportPayloadView from '../SoilReportPayloadView'

interface SavedSoilReport {
  id: string
  createdAt: string
  matrixName: string
  payload: SoilReportPayload
}

function formatReportDate(value: string): string {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SoilReportDetailPage() {
  const { id: reportId } = useParams<{ id: string }>()
  const [report, setReport] = useState<SavedSoilReport | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [downloadError, setDownloadError] = useState<string | null>(null)
  const [isDownloading, setIsDownloading] = useState(false)

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

  const downloadPdf = async () => {
    if (!report) return
    setDownloadError(null)
    setIsDownloading(true)
    try {
      const response = await fetch(`/api/soil/reports/${report.id}/pdf`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el PDF')
      if (typeof data.downloadUrl !== 'string' || data.downloadUrl.length === 0) {
        throw new Error('El PDF no tiene enlace de descarga')
      }
      window.open(data.downloadUrl, '_blank', 'noopener,noreferrer')
    } catch (pdfError) {
      setDownloadError(pdfError instanceof Error ? pdfError.message : 'No se pudo generar el PDF')
    } finally {
      setIsDownloading(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <Link href="/suelo/informes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Informes de suelo
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
                <p className="text-sm text-muted-foreground">{formatReportDate(report.createdAt)}</p>
              </div>
              <Button type="button" onClick={() => void downloadPdf()} disabled={isDownloading} className="gap-1">
                {isDownloading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />}
                Descargar PDF
              </Button>
            </div>
            {downloadError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{downloadError}</div>
            ) : null}
            <SoilReportPayloadView payload={report.payload} />
          </>
        )}
      </div>
    </DashboardLayout>
  )
}
