'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  FileText,
  AlertCircle,
  Loader2,
  Download,
} from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface ReportData {
  id: string
  created_at: string
  status: string
  template: string
  include_recommendations: boolean
  include_images: boolean
  test_areas: string[]
  download_url?: string | null
  rendered_pdf_url?: string | null
  clients: {
    id: string
    name: string
    rut: string
    contact_email?: string
    contact_phone?: string
    address?: string
  }
  results: Array<{
    id: string
    status: string
    result_type: string
    diagnosis?: string
    conclusion?: string
    recommendations?: string
    pathogen_identified?: string
    pathogen_type?: string
    severity?: string
    confidence?: string
    methodology?: string
    findings?: unknown
    test_area?: string
    created_at: string
    samples: {
      id: string
      code: string
      species: string
      variety?: string
      received_date: string
      sampling_date?: string
      description?: string
    }
    sample_tests?: {
      id: string
      test_catalog?: {
        id: string
        name: string
        code: string
        area: string
        description?: string
      }
      methods?: {
        id: string
        name: string
        code: string
        description?: string
      }
    }
    performed_by_user?: {
      id: string
      name: string
      email: string
    }
    validated_by_user?: {
      id: string
      name: string
      email: string
    }
  }>
  generated_by_user?: {
    id: string
    name: string
    email: string
  }
  responsible_user?: {
    id: string
    name: string
    email: string
  }
}

interface ViewReportModalProps {
  isOpen: boolean
  onClose: () => void
  reportId: string | null
}

export default function ViewReportModal({ isOpen, onClose, reportId }: ViewReportModalProps) {
  const [report, setReport] = useState<ReportData | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const fetchReport = useCallback(async () => {
    if (!reportId) return

    try {
      setIsLoading(true)
      setError(null)
      
      const response = await fetch(`/api/reports/view/${reportId}`)
      if (!response.ok) {
        throw new Error('Failed to fetch report details')
      }
      
      const data = await response.json()
      setReport(data)
    } catch (error) {
      console.error('Error fetching report:', error)
      setError(error instanceof Error ? error.message : 'Error al cargar el informe')
    } finally {
      setIsLoading(false)
    }
  }, [reportId])

  useEffect(() => {
    if (isOpen && reportId) {
      fetchReport()
    } else {
      setReport(null)
      setError(null)
    }
  }, [isOpen, reportId, fetchReport])

  const formatDate = (dateString: string) => {
    if (!dateString) return '—'
    return new Date(dateString).toLocaleDateString('es-ES', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    })
  }

  const handleDialogOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  const handleDownloadPdf = () => {
    if (report?.download_url) {
      window.open(report.download_url, '_blank')
    } else {
      alert('El archivo PDF aún no está disponible para descarga.')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        className="flex max-h-[90vh] max-w-5xl flex-col gap-0 overflow-hidden p-0 sm:max-w-5xl"
      >
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-start gap-3">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-green-100">
                <FileText className="h-5 w-5 text-green-700" />
              </div>
              <div>
                <DialogTitle>Informe de análisis</DialogTitle>
                <DialogDescription className="mt-1">
                  {report?.clients?.name
                    ? `${report.clients.name} — ${formatDate(report.created_at)}`
                    : 'Vista previa del informe'}
                </DialogDescription>
              </div>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleDownloadPdf}
              className="mr-6 gap-2"
            >
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          </div>
        </DialogHeader>

        <div className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain px-6 py-5">
          {isLoading ? (
            <div className="flex h-64 items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
              <span className="ml-2 text-muted-foreground">Cargando informe...</span>
            </div>
          ) : error ? (
            <div className="py-12 text-center">
              <AlertCircle className="mx-auto h-12 w-12 text-red-400" />
              <h3 className="mt-2 text-sm font-medium text-foreground">Error al cargar</h3>
              <p className="mt-1 text-sm text-muted-foreground">{error}</p>
              <Button type="button" onClick={fetchReport} className="mt-4">
                Reintentar
              </Button>
            </div>
          ) : report ? (
            <>
              <div className="h-[65vh] overflow-hidden rounded-lg border border-gray-200 bg-white">
                  {report.rendered_pdf_url?.startsWith('https://') ? (
                    <iframe
                      src={report.rendered_pdf_url}
                      className="h-full w-full border-0"
                      title="Vista previa del informe PDF"
                      loading="lazy"
                      referrerPolicy="no-referrer"
                      allow="fullscreen"
                    />
                  ) : report.rendered_pdf_url ? (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
                      <p className="text-lg text-foreground">Vista previa no disponible</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        La URL del documento no es segura
                      </p>
                      <Button
                        type="button"
                        className="mt-4 gap-2"
                        onClick={() => window.open(report.rendered_pdf_url!, '_blank')}
                      >
                        <Download className="h-4 w-4" />
                        Abrir en nueva pestaña
                      </Button>
                    </div>
                  ) : (
                    <div className="flex h-full flex-col items-center justify-center text-center">
                      <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                      <p className="text-lg text-foreground">Generando vista previa...</p>
                      <p className="mt-2 text-sm text-muted-foreground">
                        El informe se está procesando
                      </p>
                    </div>
                  )}
                </div>
            </>
          ) : (
            <div className="py-12 text-center">
              <FileText className="mx-auto h-12 w-12 text-muted-foreground" />
              <h3 className="mt-2 text-sm font-medium text-foreground">
                Informe no encontrado
              </h3>
              <p className="mt-1 text-sm text-muted-foreground">
                El informe solicitado no se pudo encontrar.
              </p>
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cerrar
          </Button>
          {report && (
            <Button type="button" onClick={handleDownloadPdf} className="gap-2">
              <Download className="h-4 w-4" />
              Descargar PDF
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
