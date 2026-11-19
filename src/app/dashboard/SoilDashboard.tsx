'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, FileText, Loader2, TestTube, Users } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SOIL_SAMPLE_STATUS_LABELS, type SoilSampleStatus } from '@/app/suelo/soilLabels'
import type { SoilDashboard as SoilDashboardData } from '@/lib/services/soilDashboard'

const STATUS_ORDER: SoilSampleStatus[] = ['received', 'in_analysis', 'completed']

function formatImportDate(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return date.toLocaleDateString('es-CL', { day: '2-digit', month: 'short', year: 'numeric' })
}

export default function SoilDashboard({
  companyId,
  showShortcuts,
}: {
  companyId?: string
  showShortcuts: boolean
}) {
  const [dashboard, setDashboard] = useState<SoilDashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchDashboard = useCallback(async () => {
    const params = new URLSearchParams()
    if (companyId) params.set('companyId', companyId)
    const query = params.toString()
    try {
      const response = await fetch(query ? `/api/dashboard/soil?${query}` : '/api/dashboard/soil')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'No se pudo cargar el dashboard de suelo')
      }
      setDashboard(data as SoilDashboardData)
      setError(null)
    } catch (err) {
      setDashboard(null)
      setError(err instanceof Error ? err.message : 'No se pudo cargar el dashboard de suelo')
    } finally {
      setIsLoading(false)
    }
  }, [companyId])

  useEffect(() => {
    setIsLoading(true)
    void fetchDashboard()
  }, [fetchDashboard])

  if (isLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  }

  if (error || !dashboard) {
    return (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          {error || 'No se pudo cargar el dashboard de suelo'}
        </div>
      </div>
    )
  }

  return (
    <div className="p-6">
      <div className="mb-8">
        <h2 className="mb-2 text-2xl font-bold text-gray-900">Dashboard de suelo</h2>
        <p className="text-gray-600">Muestras, importaciones e informes del laboratorio</p>
      </div>

      <div className="mb-8 grid grid-cols-1 gap-6 md:grid-cols-3">
        {STATUS_ORDER.map((status) => (
          <Card key={status} className="border-gray-200 shadow-sm">
            <CardContent className="pt-2">
              <p className="text-sm font-medium text-gray-600">{SOIL_SAMPLE_STATUS_LABELS[status]}</p>
              <p className="text-3xl font-bold text-gray-900">{dashboard.samplesByStatus[status]}</p>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-8 lg:grid-cols-2">
        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Últimas importaciones</CardTitle>
            <CardDescription>Planillas cargadas más recientes</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.recentImports.length > 0 ? (
              <div className="space-y-4">
                {dashboard.recentImports.map((importedFile) => (
                  <div key={importedFile.id} className="rounded-lg bg-gray-50 p-3">
                    <p className="truncate text-sm font-medium text-gray-900">{importedFile.fileName}</p>
                    <p className="text-xs text-gray-500">{formatImportDate(importedFile.createdAt)}</p>
                    <p className="mt-1 text-xs text-gray-400">
                      {importedFile.resultCount} resultados · {importedFile.sampleCount} muestras · {importedFile.warningCount} avisos
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Todavía no hay importaciones</p>
            )}
          </CardContent>
        </Card>

        <Card className="border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Informes por matriz</CardTitle>
            <CardDescription>Informes generados según la matriz de la muestra</CardDescription>
          </CardHeader>
          <CardContent>
            {dashboard.reportsByMatrix.length > 0 ? (
              <div className="space-y-3">
                {dashboard.reportsByMatrix.map((matrix) => (
                  <div key={matrix.matrixKey} className="flex items-center justify-between rounded-lg bg-gray-50 p-3">
                    <span className="text-sm font-medium text-gray-900">{matrix.matrixName}</span>
                    <span className="text-sm text-gray-500">{matrix.reportCount}</span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="py-8 text-center text-sm text-gray-500">Todavía no hay informes</p>
            )}
          </CardContent>
        </Card>
      </div>

      {showShortcuts ? (
        <Card className="mt-8 border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg font-semibold text-gray-900">Acciones rápidas</CardTitle>
            <CardDescription>Atajos a las tareas más comunes</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 gap-4">
              <Button asChild className="h-auto flex-col gap-2 py-4">
                <Link href="/suelo/nueva">
                  <TestTube className="h-8 w-8" />
                  <span>Nueva muestra</span>
                </Link>
              </Button>
              <Button asChild className="h-auto flex-col gap-2 py-4">
                <Link href="/suelo/importar">
                  <FileSpreadsheet className="h-8 w-8" />
                  <span>Importar</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto flex-col gap-2 py-4">
                <Link href="/suelo/informes">
                  <FileText className="h-8 w-8" />
                  <span>Informes</span>
                </Link>
              </Button>
              <Button variant="outline" asChild className="h-auto flex-col gap-2 py-4">
                <Link href="/clients">
                  <Users className="h-8 w-8" />
                  <span>Clientes</span>
                </Link>
              </Button>
            </div>
          </CardContent>
        </Card>
      ) : null}
    </div>
  )
}
