'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type ResultsByTypeRow = {
  typeKey: string
  label: string
  count: number
  color?: string
  selectable?: boolean
}

const ANALYSIS_AREA_PALETTE = [
  '#16a34a',
  '#4b5563',
  '#15803d',
  '#6b7280',
  '#22c55e',
  '#374151',
  '#86efac',
  '#9ca3af',
  '#166534',
  '#d1d5db'
]

function sliceColor(typeKey: string, index: number): string {
  if (typeKey === '__uncategorized__') return '#d1d5db'
  return ANALYSIS_AREA_PALETTE[index % ANALYSIS_AREA_PALETTE.length]
}

type ResultsByTypeChartProps = {
  data: ResultsByTypeRow[]
  emptyMessage?: string
  onSelect?: (typeKey: string) => void
}

function sliceFill(row: ResultsByTypeRow, index: number): string {
  if (row.color) return row.color
  return sliceColor(row.typeKey, index)
}

export function ResultsByTypeChart({
  data,
  emptyMessage = 'No hay resultados agrupados por tipo de análisis.',
  onSelect,
}: ResultsByTypeChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)
  const hasSelectableRows = data.some((row) => row.selectable)

  if (total === 0 && !hasSelectableRows) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        {emptyMessage}
      </div>
    )
  }

  const chartPoints = data.map((row, index) => ({
    ...row,
    fill: sliceFill(row, index)
  }))
  const piePoints = chartPoints.filter((row) => row.count > 0)

  const legend = (
    <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-sm">
      {chartPoints.map((row) => {
        const content = (
          <>
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: row.fill }}
                aria-hidden
              />
              <span className="truncate text-gray-700">{row.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-gray-900">{row.count}</span>
          </>
        )
        if (onSelect && row.selectable) {
          return (
            <li key={row.typeKey} className="border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <button
                type="button"
                onClick={() => onSelect(row.typeKey)}
                className="flex w-full items-center justify-between gap-3 text-left hover:text-gray-900"
              >
                {content}
              </button>
            </li>
          )
        }
        return (
          <li key={row.typeKey} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            {content}
          </li>
        )
      })}
    </ul>
  )

  if (piePoints.length === 0) {
    return (
      <div className="flex flex-col gap-4">
        <p className="text-sm text-gray-500">{emptyMessage}</p>
        {legend}
      </div>
    )
  }

  return (
    <div className="flex min-h-72 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto h-56 w-full max-w-[220px] sm:h-64 sm:max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={piePoints}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={1}
              stroke="#fff"
              style={{ cursor: onSelect ? 'pointer' : 'default' }}
              onClick={(_entry, index) => {
                const row = piePoints[index]
                if (onSelect && row?.selectable) onSelect(row.typeKey)
              }}
            >
              {piePoints.map((entry, sliceIndex) => (
                <Cell key={`${entry.typeKey}-${sliceIndex}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value) || 0, 'Cantidad']}
              contentStyle={{
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                fontSize: '13px'
              }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      {legend}
    </div>
  )
}
