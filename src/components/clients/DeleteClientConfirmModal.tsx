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

interface DeleteClientConfirmModalProps {
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
  clientName: string
  isDeleting?: boolean
}

export default function DeleteClientConfirmModal({
  isOpen,
  onClose,
  onConfirm,
  clientName,
  isDeleting = false,
}: DeleteClientConfirmModalProps) {
  const handleDialogOpenChange = (open: boolean) => {
    if (!open && !isDeleting) onClose()
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleDialogOpenChange}>
      <DialogContent
        showCloseButton={!isDeleting}
        className="sm:max-w-lg"
        onInteractOutside={(event) => {
          if (isDeleting) event.preventDefault()
        }}
        onEscapeKeyDown={(event) => {
          if (isDeleting) event.preventDefault()
        }}
      >
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
            ¿Estás seguro de que deseas eliminar a <strong>{clientName}</strong>?
          </p>
          <p className="text-sm text-gray-600">
            El cliente será eliminado permanentemente. Los registros históricos (como muestras)
            mantendrán la referencia al cliente, pero el cliente ya no aparecerá en la lista de
            clientes activos.
          </p>
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" disabled={isDeleting} onClick={onClose}>
            Cancelar
          </Button>
          <Button
            type="button"
            variant="destructive"
            disabled={isDeleting}
            onClick={onConfirm}
            className="gap-2"
          >
            {isDeleting ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Eliminando...
              </>
            ) : (
              'Eliminar cliente'
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
