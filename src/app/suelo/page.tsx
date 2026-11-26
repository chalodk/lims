'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileSpreadsheet, Loader2, Plus, TestTube } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SOIL_SAMPLE_STATUS_LABELS, type SoilSampleStatus } from './soilLabels'
import { soilSampledByLabel } from '@/lib/soil/sampleIntake'

interface SoilSampleListItem {
  id: string
  code: string
  status: SoilSampleStatus
  receivedAt: string
  sampledAt: string
  sampledBy: string
  clientName: string | null
  subsampleCount: number
  resultCount: number
}

export default function SoilSamplesPage() {
  const [samples, setSamples] = useState<SoilSampleListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [searchText, setSearchText] = useState('')

  useEffect(() => {
    const loadSamples = async () => {
      try {
        const response = await fetch('/api/soil/samples')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar muestras')
        setSamples(data.samples || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar muestras')
      } finally {
        setIsLoading(false)
      }
    }
    void loadSamples()
  }, [])

  const normalizedSearch = searchText.trim().toLowerCase()
  const visibleSamples = normalizedSearch
    ? samples.filter(
        (sample) =>
          sample.code.includes(normalizedSearch) ||
          (sample.clientName ?? '').toLowerCase().includes(normalizedSearch)
      )
    : samples

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <TestTube className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Muestras</h1>
              <p className="text-sm text-muted-foreground">
                Cliente, número y comentario. Los resultados llegan con la planilla.
              </p>
            </div>
          </div>
          <div className="flex gap-2">
            <Button asChild variant="outline" className="gap-1">
              <Link href="/suelo/importar">
                <FileSpreadsheet className="h-4 w-4" />
                Importar resultados
              </Link>
            </Button>
            <Button asChild className="gap-1">
              <Link href="/suelo/nueva">
                <Plus className="h-4 w-4" />
                Nueva muestra
              </Link>
            </Button>
          </div>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <Card className="overflow-hidden">
          <div className="border-b border-gray-100 p-3">
            <input
              type="search"
              value={searchText}
              onChange={(event) => setSearchText(event.target.value)}
              placeholder="Buscar por código o cliente"
              className="h-9 w-full max-w-sm rounded-lg border border-gray-200 px-3 text-sm"
              aria-label="Buscar muestras"
            />
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Código</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Recepción</TableHead>
                    <TableHead>Toma de muestra</TableHead>
                    <TableHead>Muestreado por</TableHead>
                    <TableHead className="text-right">Submuestras</TableHead>
                    <TableHead className="text-right">Resultados</TableHead>
                    <TableHead>Estado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleSamples.map((sample) => (
                    <TableRow key={sample.id}>
                      <TableCell className="font-medium">
                        <Link href={`/suelo/${sample.id}`} className="text-green-700 hover:underline">
                          {sample.code}
                        </Link>
                      </TableCell>
                      <TableCell>{sample.clientName ?? '—'}</TableCell>
                      <TableCell>{sample.receivedAt}</TableCell>
                      <TableCell>{sample.sampledAt}</TableCell>
                      <TableCell>{soilSampledByLabel(sample.sampledBy)}</TableCell>
                      <TableCell className="text-right">{sample.subsampleCount}</TableCell>
                      <TableCell className="text-right">{sample.resultCount}</TableCell>
                      <TableCell>
                        <Badge variant={sample.status === 'completed' ? 'default' : 'secondary'}>
                          {SOIL_SAMPLE_STATUS_LABELS[sample.status] ?? sample.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                  {visibleSamples.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        {samples.length === 0 ? 'Aún no hay muestras de suelo' : 'Sin coincidencias'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
    </DashboardLayout>
  )
}
