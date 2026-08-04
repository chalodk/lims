'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export type PrevalenceRow = {
  pathogenName: string
  count: number
  pct: number
}

type PrevalenceBarChartProps = {
  data: PrevalenceRow[]
}

export function PrevalenceBarChart({ data }: PrevalenceBarChartProps) {
  if (data.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        Sin detecciones normalizadas en el período.
      </div>
    )
  }

  const chartData = [...data].reverse()

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={chartData} layout="vertical" margin={{ left: 8, right: 16, top: 8, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" horizontal={false} />
          <XAxis type="number" allowDecimals={false} tick={{ fontSize: 12 }} />
          <YAxis
            type="category"
            dataKey="pathogenName"
            width={140}
            tick={{ fontSize: 11 }}
          />
          <Tooltip
            formatter={(value, _name, item) => {
              const pct = (item?.payload as PrevalenceRow | undefined)?.pct
              return [`${Number(value) || 0} (${pct ?? 0}%)`, 'Detecciones']
            }}
            contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
          />
          <Bar dataKey="count" fill="#2563eb" radius={[0, 4, 4, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
