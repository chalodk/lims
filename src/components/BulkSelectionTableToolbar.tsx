'use client'

import { Check, Loader2, Trash2, X } from 'lucide-react'
import { Button } from '@/components/ui/button'

export type BulkToolbarValidateAction = {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
}

export type BulkToolbarDeleteAction = {
  onClick: () => void
  disabled: boolean
  isLoading: boolean
}

type BulkSelectionToolbarRowProps = {
  columnSpan: number
  selectedCount: number
  filteredRowCount: number
  selectionSummaryText: string
  onSelectAll: () => void
  onClearSelection: () => void
  validateAction?: BulkToolbarValidateAction | null
  deleteAction?: BulkToolbarDeleteAction | null
}

/**
 * Fila de tabla a ancho completo con acciones masivas (misma UX que informes).
 */
export function BulkSelectionToolbarRow({
  columnSpan,
  selectedCount,
  filteredRowCount,
  selectionSummaryText,
  onSelectAll,
  onClearSelection,
  validateAction,
  deleteAction,
}: BulkSelectionToolbarRowProps) {
  if (selectedCount === 0) {
    return null
  }

  const allFilteredSelected = selectedCount === filteredRowCount && filteredRowCount > 0

  return (
    <tr>
      <th colSpan={columnSpan} className="px-3 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <input
              type="checkbox"
              checked={allFilteredSelected}
              onChange={onSelectAll}
              className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
            />
            <span className="text-sm font-medium text-gray-700">{selectionSummaryText}</span>
          </div>
          <div className="flex items-center gap-2">
            {validateAction && (
              <Button
                type="button"
                size="sm"
                onClick={validateAction.onClick}
                disabled={validateAction.disabled}
                className="gap-1.5"
              >
                {validateAction.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Validar
              </Button>
            )}
            {deleteAction && (
              <Button
                type="button"
                size="sm"
                variant="destructive"
                onClick={deleteAction.onClick}
                disabled={deleteAction.disabled}
                className="gap-1.5"
              >
                {deleteAction.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Borrar
              </Button>
            )}
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={onClearSelection}
              className="gap-1.5"
            >
              <X className="h-4 w-4" />
              Cancelar
            </Button>
          </div>
        </div>
      </th>
    </tr>
  )
}

type BulkSelectAllHeaderCheckboxProps = {
  checked: boolean
  onChange: () => void
  title?: string
}

/**
 * Celda de cabecera con checkbox “seleccionar todos” (columna al final, como en informes).
 */
export function BulkSelectAllHeaderCheckbox({
  checked,
  onChange,
  title = 'Seleccionar todos',
}: BulkSelectAllHeaderCheckboxProps) {
  return (
    <th className="w-12 px-3 py-3 text-center text-xs font-medium uppercase tracking-wider text-gray-500">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
        title={title}
      />
    </th>
  )
}

type BulkRowSelectionCheckboxProps = {
  checked: boolean
  onChange: () => void
}

export function BulkRowSelectionCheckbox({ checked, onChange }: BulkRowSelectionCheckboxProps) {
  return (
    <td className="px-3 py-4 text-center" onClick={(e) => e.stopPropagation()}>
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 rounded border-gray-300 text-green-600 focus:ring-green-600"
      />
    </td>
  )
}
