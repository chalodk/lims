'use client'

import { AlertCircle, Download, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'

interface SoilReportPreviewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  renderedPdfUrl: string | null
  downloadUrl: string | null
  isLoading?: boolean
}

/** Vista previa del PDF de suelo. El iframe solo acepta una URL https. */
export default function SoilReportPreviewDialog({
  open,
  onOpenChange,
  renderedPdfUrl,
  downloadUrl,
  isLoading = false,
}: SoilReportPreviewDialogProps) {
  const securePreview = renderedPdfUrl?.startsWith('https://') ? renderedPdfUrl : null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[90vh] max-w-4xl flex-col gap-0 overflow-hidden p-0 sm:max-w-4xl">
        <DialogHeader className="border-b border-gray-100">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div>
              <DialogTitle>Informe</DialogTitle>
              <DialogDescription>Vista previa del informe</DialogDescription>
            </div>
            {downloadUrl ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={() => window.open(downloadUrl, '_blank', 'noopener,noreferrer')}
              >
                <Download className="h-4 w-4" />
                Descargar PDF
              </Button>
            ) : null}
          </div>
        </DialogHeader>
        <div className="min-h-0 flex-1 px-6 py-5">
          <div className="h-[65vh] overflow-hidden rounded-lg border border-gray-200 bg-white">
            {isLoading ? (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <Loader2 className="mb-4 h-12 w-12 animate-spin text-primary" />
                <p className="text-lg text-foreground">Generando vista previa...</p>
              </div>
            ) : securePreview ? (
              <iframe
                src={securePreview}
                className="h-full w-full border-0"
                title="Vista previa del informe PDF"
                loading="lazy"
                referrerPolicy="no-referrer"
                allow="fullscreen"
              />
            ) : (
              <div className="flex h-full flex-col items-center justify-center text-center">
                <AlertCircle className="mb-4 h-12 w-12 text-yellow-500" />
                <p className="text-lg text-foreground">Vista previa no disponible</p>
                <p className="mt-2 text-sm text-muted-foreground">El PDF todavía no tiene un enlace seguro</p>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
