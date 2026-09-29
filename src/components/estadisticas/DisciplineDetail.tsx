'use client'

import { ArrowLeft } from 'lucide-react'
import { PrevalenceBarChart } from '@/components/cliente/PrevalenceBarChart'
import { SamplesAndPositivesChart } from '@/components/estadisticas/SamplesAndPositivesChart'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import type { DisciplineDashboard, DisciplineMonths } from '@/lib/stats/disciplineDashboard'
import { SPECIES_FAMILIES } from '@/lib/stats/speciesFamilies'

type DisciplineDetailProps = {
  disciplineLabel: string
  disciplineColor: string
  months: DisciplineMonths
  onMonthsChange: (months: DisciplineMonths) => void
  familyKey: string
  onFamilyChange: (familyKey: string) => void
  onBack: () => void
  dashboard: DisciplineDashboard | null
  isLoading: boolean
  error: string | null
}

export function DisciplineDetail({
  disciplineLabel,
  disciplineColor,
  months,
  onMonthsChange,
  familyKey,
  onFamilyChange,
  onBack,
  dashboard,
  isLoading,
  error,
}: DisciplineDetailProps) {
  const prevalenceHeight = Math.max(288, (dashboard?.prevalence.length ?? 0) * 36)

  return (
    <div className="p-6">
      <div className="mb-8">
        <Button variant="ghost" className="mb-4 -ml-2 gap-2" onClick={onBack}>
          <ArrowLeft className="h-4 w-4" />
          Volver al resumen
        </Button>
        <div className="flex items-center gap-3">
          <span
            className="h-3 w-3 shrink-0 rounded-full"
            style={{ backgroundColor: disciplineColor }}
            aria-hidden
          />
          <h1 className="text-3xl font-bold text-gray-900">{disciplineLabel}</h1>
        </div>
        <p className="mt-2 text-gray-600">Prevalencia y dinámica de muestras de la disciplina</p>
        <div className="mt-4 max-w-sm">
          <label htmlFor="species-family-filter" className="mb-1 block text-sm font-medium text-gray-700">
            Familia
          </label>
          <select
            id="species-family-filter"
            value={familyKey}
            onChange={(event) => onFamilyChange(event.target.value)}
            className="w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm text-gray-900 focus:border-green-500 focus:outline-none focus:ring-2 focus:ring-green-500"
          >
            <option value="">Todas las especies</option>
            {SPECIES_FAMILIES.map((family) => (
              <option key={family.key} value={family.key}>
                {family.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {error ? (
        <Card className="border-red-200">
          <CardContent className="py-6 text-sm text-red-600">{error}</CardContent>
        </Card>
      ) : (
      <div className="grid grid-cols-1 gap-6">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Prevalencia por patógeno</CardTitle>
            <CardDescription>Top detecciones en el período</CardDescription>
          </CardHeader>
          <CardContent>
            {isLoading || !dashboard ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
              </div>
            ) : (
              <PrevalenceBarChart
                data={dashboard.prevalence}
                height={prevalenceHeight}
                yAxisWidth={280}
                emptyMessage="Sin detecciones en el período."
              />
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader className="flex-row items-start justify-between gap-4">
            <div>
              <CardTitle className="text-lg font-semibold text-gray-900">Muestras y Positivos por mes</CardTitle>
              <CardDescription>Evolución mensual (últimos {months} meses)</CardDescription>
            </div>
            <div className="flex shrink-0 rounded-lg bg-gray-100 p-1" role="group" aria-label="Ventana temporal">
              {([6, 12] as const).map((windowMonths) => {
                const isActive = months === windowMonths
                return (
                  <button
                    key={windowMonths}
                    type="button"
                    aria-pressed={isActive}
                    disabled={isLoading}
                    onClick={() => onMonthsChange(windowMonths)}
                    className={
                      isActive
                        ? 'rounded-md bg-white px-3 py-1.5 text-sm font-medium text-gray-900 shadow-sm'
                        : 'rounded-md px-3 py-1.5 text-sm font-medium text-gray-600 hover:text-gray-900'
                    }
                  >
                    {windowMonths} meses
                  </button>
                )
              })}
            </div>
          </CardHeader>
          <CardContent>
            {isLoading || !dashboard ? (
              <div className="flex h-64 items-center justify-center">
                <div className="h-8 w-8 animate-spin rounded-full border-b-2 border-green-600" />
              </div>
            ) : (
              <SamplesAndPositivesChart data={dashboard.monthly} />
            )}
          </CardContent>
        </Card>
      </div>
      )}
    </div>
  )
}
