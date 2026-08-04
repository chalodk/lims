'use client'

import { AlertTriangle } from 'lucide-react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'

interface DeleteConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  sampleCode: string
}

export default function DeleteConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  sampleCode,
}: DeleteConfirmModalProps) {
  const handleDialogOpenChange = (open: boolean) => {
    if (!open) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader className="border-b border-gray-100 bg-white">
          <div className="flex items-start gap-3 pr-8">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <AlertTriangle className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <DialogTitle>Confirmar eliminación</DialogTitle>
              <DialogDescription className="mt-1">
                Esta acción no se puede deshacer
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-2 px-6 py-5">
          <p className="text-sm text-gray-900">
            ¿Estás seguro de que quieres eliminar la muestra{' '}
            <strong>{sampleCode}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            Todos los datos asociados con esta muestra se eliminarán permanentemente,
            incluyendo resultados e informes.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm}>
            Eliminar muestra
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
