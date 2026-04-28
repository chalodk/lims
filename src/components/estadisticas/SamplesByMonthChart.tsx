'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis
} from 'recharts'

export type SamplesByMonthRow = {
  monthKey: string
  label: string
  count: number
}

type SamplesByMonthChartProps = {
  data: SamplesByMonthRow[]
}

export function SamplesByMonthChart({ data }: SamplesByMonthChartProps) {
  const hasData = data.some((row) => row.count > 0)

  if (!hasData) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-gray-500">
        No hay muestras registradas en los últimos doce meses.
      </div>
    )
  }

  return (
    <div className="h-72 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 8 }}>
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: '#6b7280' }}
            interval={0}
            angle={-32}
            textAnchor="end"
            height={72}
          />
          <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: '#6b7280' }} width={36} />
          <Tooltip
            formatter={(value) => [Number(value) || 0, 'Muestras']}
            labelFormatter={(label) => String(label)}
            contentStyle={{
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              fontSize: '13px'
            }}
          />
          <Bar dataKey="count" fill="#16a34a" radius={[4, 4, 0, 0]} name="Muestras" />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
