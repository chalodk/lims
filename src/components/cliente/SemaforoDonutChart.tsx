'use client'

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from 'recharts'

export type SemaforoData = {
  critico: number
  controlado: number
  hasNormalizedFindings: boolean
}

type SemaforoDonutChartProps = {
  data: SemaforoData
}

export function SemaforoDonutChart({ data }: SemaforoDonutChartProps) {
  if (!data.hasNormalizedFindings) {
    return (
      <div className="flex h-64 flex-col items-center justify-center gap-2 px-4 text-center text-sm text-gray-500">
        <p className="font-medium text-gray-700">Sin marcas SAG registradas aún</p>
        <p>
          El semáforo se alimenta de detecciones normalizadas con tolerancia cero marcada por el laboratorio.
        </p>
      </div>
    )
  }

  const chartPoints = [
    { key: 'critico', label: 'Crítico', count: data.critico, fill: '#dc2626' },
    { key: 'controlado', label: 'Controlado', count: data.controlado, fill: '#16a34a' },
  ].filter((row) => row.count > 0)

  const total = data.critico + data.controlado

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
                <Cell key={entry.key} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value) => [Number(value) || 0, 'Detecciones']}
              contentStyle={{ borderRadius: '8px', border: '1px solid #e5e7eb', fontSize: '13px' }}
            />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <ul className="flex-1 space-y-2 text-sm">
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-red-600" />
            Crítico (tol. cero SAG)
          </span>
          <span className="font-medium text-gray-900">
            {data.critico}
            {total > 0 ? ` (${((data.critico / total) * 100).toFixed(1)}%)` : ''}
          </span>
        </li>
        <li className="flex items-center justify-between gap-3">
          <span className="flex items-center gap-2 text-gray-700">
            <span className="inline-block h-2.5 w-2.5 rounded-full bg-green-600" />
            Controlado
          </span>
          <span className="font-medium text-gray-900">
            {data.controlado}
            {total > 0 ? ` (${((data.controlado / total) * 100).toFixed(1)}%)` : ''}
          </span>
        </li>
      </ul>
    </div>
  )
}
