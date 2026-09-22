'use client'

import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import type { MonthlySamplesPoint } from '@/lib/stats/disciplineDashboard'

type SamplesAndPositivesChartProps = {
  data: MonthlySamplesPoint[]
}

function MonthlyTooltipContent({
  active,
  payload,
}: {
  active?: boolean
  payload?: ReadonlyArray<{ payload?: MonthlySamplesPoint }>
}) {
  const row = payload?.[0]?.payload
  if (!active || !row) return null

  const positivity = row.positivityPct.toFixed(1)

  return (
    <div className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-sm shadow-sm">
      <p className="font-medium text-gray-900">Mes: {row.label}</p>
      <p className="text-gray-700">Total Muestras: {row.totalSamples.toLocaleString('es')}</p>
      <p className="text-gray-700">
        Muestras Positivas: {row.positiveSamples.toLocaleString('es')} (% Positividad: {positivity}%)
      </p>
    </div>
  )
}

export function SamplesAndPositivesChart({ data }: SamplesAndPositivesChartProps) {
  return (
    <div className="h-80 w-full">
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
            content={(props) => (
              <MonthlyTooltipContent
                active={props.active}
                payload={props.payload as ReadonlyArray<{ payload?: MonthlySamplesPoint }> | undefined}
              />
            )}
          />
          <Legend />
          <Bar dataKey="totalSamples" name="Total de muestras" fill="#16a34a" radius={[4, 4, 0, 0]} />
          <Bar dataKey="positiveSamples" name="Muestras positivas" fill="#2563eb" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  )
}
