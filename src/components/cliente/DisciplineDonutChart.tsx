'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type DisciplineRow = {
  typeKey: string
  label: string
  count: number
}

const PALETTE = ['#16a34a', '#2563eb', '#9333ea', '#ca8a04', '#dc2626', '#0891b2', '#ea580c']

type DisciplineDonutChartProps = {
  data: DisciplineRow[]
}

export function DisciplineDonutChart({ data }: DisciplineDonutChartProps) {
  const total = data.reduce((sum, row) => sum + row.count, 0)
  if (total === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Sin análisis en el período.
      </div>
    )
  }

  const chartPoints = data.map((row, index) => ({
    ...row,
    fill: PALETTE[index % PALETTE.length],
  }))

  return (
    <div className="flex h-72 flex-col gap-4 sm:flex-row sm:items-center">
      <div className="mx-auto h-56 w-full max-w-[220px]">
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
              stroke="#fff"
              strokeWidth={1}
            >
              {chartPoints.map((entry) => (
                <Cell key={entry.typeKey} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value) || 0, 'Cantidad']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        {chartPoints.map((row) => (
          <li key={row.typeKey} className="flex items-center justify-between gap-3">
            <span className="flex items-center gap-2 text-gray-700">
              <span className="inline-block h-2.5 w-2.5 rounded-full" style={{ backgroundColor: row.fill }} />
              {row.label}
            </span>
            <span className="font-medium text-gray-900">
              {row.count} ({((row.count / total) * 100).toFixed(1)}%)
            </span>
          </li>
        ))}
      </ul>
    </div>
  )
}
