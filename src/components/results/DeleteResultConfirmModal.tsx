'use client'

import { AlertTriangle, Loader2 } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteResultConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  sampleCode: string
  testAreaLabel?: string | null
  isDeleting: boolean
  errorMessage: string | null
}

export default function DeleteResultConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sampleCode,
  testAreaLabel,
  isDeleting,
  errorMessage,
}: DeleteResultConfirmModalProps) {
  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isDeleting) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg" showCloseButton={!isDeleting}>
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Eliminar resultado</DialogTitle>
              <DialogDescription className="mt-1">
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 px-6 py-5">
          <p className="text-sm text-gray-900">
            ¿Eliminar el resultado de la muestra <strong>{sampleCode}</strong>
            {testAreaLabel ? (
              <>
                {' '}
                (<span className="capitalize">{testAreaLabel.replace('_', ' ')}</span>)?
              </>
            ) : (
              '?'
            )}
          </p>
          <p className="text-sm text-gray-600">
            Los resultados validados no se pueden eliminar desde el sistema.
          </p>
          {errorMessage && (
            <p className="text-sm text-red-600" role="alert">
              {errorMessage}
            </p>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose} disabled={isDeleting}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={isDeleting}>
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando…
              </>
            ) : (
              'Eliminar resultado'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
