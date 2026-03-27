'use client'

import { Check, Loader2, Trash2, X } from 'lucide-react'

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
              className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
            />
            <span className="text-sm font-medium text-gray-700">{selectionSummaryText}</span>
          </div>
          <div className="flex items-center gap-2">
            {validateAction && (
              <button
                type="button"
                onClick={validateAction.onClick}
                disabled={validateAction.disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 text-white text-sm font-medium rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {validateAction.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Check className="h-4 w-4" />
                )}
                Validar
              </button>
            )}
            {deleteAction && (
              <button
                type="button"
                onClick={deleteAction.onClick}
                disabled={deleteAction.disabled}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {deleteAction.isLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Trash2 className="h-4 w-4" />
                )}
                Borrar
              </button>
            )}
            <button
              type="button"
              onClick={onClearSelection}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-gray-100 text-gray-700 text-sm font-medium rounded-md hover:bg-gray-200 transition-colors"
            >
              <X className="h-4 w-4" />
              Cancelar
            </button>
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
    <th className="px-3 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider w-12">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
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
    <td className="px-3 py-4 text-center">
      <input
        type="checkbox"
        checked={checked}
        onChange={onChange}
        className="h-4 w-4 text-indigo-600 rounded border-gray-300 focus:ring-indigo-500"
      />
    </td>
  )
}
