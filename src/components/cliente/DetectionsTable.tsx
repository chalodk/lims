'use client'

import Link from 'next/link'
import { AlertTriangle, FileText } from 'lucide-react'

export type DetectionRow = {
  id: string
  sampleCode: string
  pathogenName: string
  quantity: string | null
  testAreaLabel: string
  isSagZeroTolerance: boolean
  reportId: string | null
  createdAt: string
}

type DetectionsTableProps = {
  rows: DetectionRow[]
  hasNormalizedFindings: boolean
  onOpenReport?: (reportId: string) => void
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CL')
}

export function DetectionsTable({
  rows,
  hasNormalizedFindings,
  onOpenReport,
}: DetectionsTableProps) {
  if (!hasNormalizedFindings) {
    return (
      <div className="rounded-lg border border-amber-200 bg-amber-50 p-6 text-sm text-amber-900">
        <div className="mb-1 flex items-center gap-2 font-medium">
          <AlertTriangle className="h-4 w-4" />
          Sin marcas SAG registradas aún
        </div>
        <p>
          Cuando el laboratorio marque tolerancia cero en los resultados, las detecciones aparecerán aquí.
          No interpretes la ausencia de filas como “todo controlado”.
        </p>
      </div>
    )
  }

  if (rows.length === 0) {
    return (
      <div className="rounded-lg border border-gray-200 bg-white p-8 text-center text-sm text-gray-500">
        No hay detecciones en el período seleccionado.
      </div>
    )
  }

  return (
    <div className="overflow-hidden rounded-lg border border-gray-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Muestra
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Patógeno
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Cantidad
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Disciplina
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Tol. cero SAG
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Fecha
              </th>
              <th className="px-4 py-3 text-left text-xs font-medium uppercase tracking-wider text-gray-500">
                Informe
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-gray-50">
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-900">
                  {row.sampleCode}
                </td>
                <td className="px-4 py-3 text-sm text-gray-900">{row.pathogenName}</td>
                <td className="whitespace-nowrap px-4 py-3 text-sm font-mono text-gray-700">
                  {row.quantity || '—'}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {row.testAreaLabel}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {row.isSagZeroTolerance ? (
                    <span className="inline-flex rounded-full bg-red-100 px-2 py-1 text-xs font-medium text-red-700">
                      Crítico
                    </span>
                  ) : (
                    <span className="inline-flex rounded-full bg-green-100 px-2 py-1 text-xs font-medium text-green-700">
                      Controlado
                    </span>
                  )}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm text-gray-700">
                  {formatDate(row.createdAt)}
                </td>
                <td className="whitespace-nowrap px-4 py-3 text-sm">
                  {row.reportId ? (
                    onOpenReport ? (
                      <button
                        type="button"
                        onClick={() => onOpenReport(row.reportId!)}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <FileText className="h-4 w-4" />
                        Ver
                      </button>
                    ) : (
                      <Link
                        href={`/reports?report=${row.reportId}`}
                        className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800"
                      >
                        <FileText className="h-4 w-4" />
                        Ver
                      </Link>
                    )
                  ) : (
                    <span className="text-gray-400">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
