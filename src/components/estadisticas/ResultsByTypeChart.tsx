'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type ResultsByTypeRow = {
  typeKey: string
  label: string
  count: number
}

const ANALYSIS_AREA_PALETTE = [
  '#16a34a',
  '#2563eb',
  '#dc2626',
  '#ca8a04',
  '#9333ea',
  '#0891b2',
  '#ea580c',
  '#4f46e5',
  '#059669',
  '#7c3aed'
]

function sliceColor(typeKey: string, index: number): string {
  if (typeKey === '__uncategorized__') return '#d1d5db'
  return ANALYSIS_AREA_PALETTE[index % ANALYSIS_AREA_PALETTE.length]
}

type ResultsByTypeChartProps = {
  data: ResultsByTypeRow[]
}

export function ResultsByTypeChart({ data }: ResultsByTypeChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)

  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        No hay resultados agrupados por tipo de análisis.
      </div>
    )
  }

  const chartPoints = data.map((row, index) => ({
    ...row,
    fill: sliceColor(row.typeKey, index)
  }))

  return (
    <div className="flex h-72 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto h-56 w-full max-w-[220px] sm:h-64 sm:max-w-[260px]">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={chartPoints}
              dataKey="count"
              nameKey="label"
              cx="50%"
              cy="50%"
              innerRadius={48}
              outerRadius={88}
              paddingAngle={2}
              strokeWidth={1}
              stroke="#fff"
            >
              {chartPoints.map((entry, sliceIndex) => (
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
      <ul className="flex min-w-0 flex-1 flex-col justify-center gap-2 text-sm">
        {chartPoints.map((row) => (
          <li key={row.typeKey} className="flex items-center justify-between gap-3 border-b border-gray-100 pb-2 last:border-0 last:pb-0">
            <span className="flex min-w-0 items-center gap-2">
              <span
                className="h-3 w-3 shrink-0 rounded-sm"
                style={{ backgroundColor: row.fill }}
                aria-hidden
              />
              <span className="truncate text-gray-700">{row.label}</span>
            </span>
            <span className="shrink-0 font-medium tabular-nums text-gray-900">{row.count}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
