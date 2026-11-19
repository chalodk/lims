'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { fieldClassName } from '@/components/ui/form-field-styles'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { SOIL_SAMPLE_STATUS_LABELS, type SoilSampleStatus } from '../../soilLabels'
import SoilReportPayloadView from '../SoilReportPayloadView'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'

interface MatrixOption {
  id: string
  name: string
}

interface CandidateSample {
  id: string
  code: string
  clientName: string | null
  receivedAt: string
  status: SoilSampleStatus
  matchingResultCount: number
}

export default function NewSoilReportPage() {
  const router = useRouter()
  const [matrices, setMatrices] = useState<MatrixOption[]>([])
  const [matrixId, setMatrixId] = useState('')
  const [samples, setSamples] = useState<CandidateSample[]>([])
  const [selectedSampleIds, setSelectedSampleIds] = useState<Set<string>>(new Set())
  const [searchText, setSearchText] = useState('')
  const [payload, setPayload] = useState<SoilReportPayload | null>(null)
  const [isLoadingMatrices, setIsLoadingMatrices] = useState(true)
  const [isLoadingSamples, setIsLoadingSamples] = useState(false)
  const [isBuildingPayload, setIsBuildingPayload] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadMatrices = async () => {
      try {
        const response = await fetch('/api/soil/catalog')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar las matrices')
        setMatrices(data.matrices || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar las matrices')
      } finally {
        setIsLoadingMatrices(false)
      }
    }
    void loadMatrices()
  }, [])

  useEffect(() => {
    if (!matrixId) {
      setSamples([])
      return
    }
    const selectedMatrixId = matrixId
    const loadSamples = async () => {
      setIsLoadingSamples(true)
      setError(null)
      setSelectedSampleIds(new Set())
      setPayload(null)
      try {
        const response = await fetch(`/api/soil/reports/candidates?matrix_id=${selectedMatrixId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar muestras')
        setSamples(data.samples || [])
      } catch (loadError) {
        setSamples([])
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar muestras')
      } finally {
        setIsLoadingSamples(false)
      }
    }
    void loadSamples()
  }, [matrixId])

  const normalizedSearch = searchText.trim().toLowerCase()
  const visibleSamples = normalizedSearch
    ? samples.filter(
        (sample) =>
          sample.code.includes(normalizedSearch) ||
          (sample.clientName ?? '').toLowerCase().includes(normalizedSearch)
      )
    : samples

  const toggleSample = (sampleId: string) => {
    setPayload(null)
    setSelectedSampleIds((previous) => {
      const next = new Set(previous)
      if (next.has(sampleId)) next.delete(sampleId)
      else next.add(sampleId)
      return next
    })
  }

  const toggleVisibleSamples = () => {
    setPayload(null)
    setSelectedSampleIds((previous) => {
      const next = new Set(previous)
      const allVisibleSelected = visibleSamples.every((sample) => next.has(sample.id))
      for (const sample of visibleSamples) {
        if (allVisibleSelected) next.delete(sample.id)
        else next.add(sample.id)
      }
      return next
    })
  }

  const buildPayload = async () => {
    setError(null)
    setIsBuildingPayload(true)
    try {
      const query = new URLSearchParams({ matrix_id: matrixId })
      for (const sampleId of selectedSampleIds) query.append('sample_id', sampleId)
      const response = await fetch(`/api/soil/reports/candidates?${query.toString()}`)
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo armar el informe')
      if ((data.omittedSampleCodes || []).length > 0) {
        throw new Error(`Estas muestras no tienen resultados de esta matriz: ${data.omittedSampleCodes.join(', ')}`)
      }
      setPayload(data.payload)
    } catch (buildError) {
      setError(buildError instanceof Error ? buildError.message : 'No se pudo armar el informe')
    } finally {
      setIsBuildingPayload(false)
    }
  }

  const createReport = async () => {
    setError(null)
    setIsSaving(true)
    try {
      const response = await fetch('/api/soil/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matrix_id: matrixId, sample_ids: [...selectedSampleIds] }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo crear el informe')
      router.push(`/suelo/informes/${data.report.id}`)
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : 'No se pudo crear el informe')
      setIsSaving(false)
    }
  }

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <Link href="/suelo/informes" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Informes de suelo
        </Link>
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-foreground">Crear informe</h1>
          <p className="text-sm text-muted-foreground">
            Elige la matriz y las muestras. El informe guarda los resultados cuyo análisis aplica a esa matriz.
          </p>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <Card className="max-w-sm space-y-1.5 p-4">
          <Label htmlFor="report-matrix">Matriz</Label>
          {isLoadingMatrices ? (
            <Loader2 className="h-4 w-4 animate-spin text-green-600" />
          ) : (
            <select
              id="report-matrix"
              value={matrixId}
              onChange={(event) => setMatrixId(event.target.value)}
              className={fieldClassName}
            >
              <option value="">Selecciona una matriz</option>
              {matrices.map((matrix) => (
                <option key={matrix.id} value={matrix.id}>
                  {matrix.name}
                </option>
              ))}
            </select>
          )}
        </Card>

        {matrixId ? (
          <Card className="overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-gray-100 p-3">
              <input
                type="search"
                value={searchText}
                onChange={(event) => setSearchText(event.target.value)}
                placeholder="Buscar por código o cliente"
                className="h-9 w-full max-w-sm rounded-lg border border-gray-200 px-3 text-sm"
                aria-label="Buscar muestras"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => void buildPayload()}
                disabled={selectedSampleIds.size === 0 || isBuildingPayload}
              >
                {isBuildingPayload ? <Loader2 className="h-4 w-4 animate-spin" /> : `Armar informe (${selectedSampleIds.size})`}
              </Button>
            </div>
            {isLoadingSamples ? (
              <div className="flex justify-center py-12">
                <Loader2 className="h-6 w-6 animate-spin text-green-600" />
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="w-10">
                        <input
                          type="checkbox"
                          aria-label="Seleccionar muestras visibles"
                          checked={visibleSamples.length > 0 && visibleSamples.every((sample) => selectedSampleIds.has(sample.id))}
                          onChange={toggleVisibleSamples}
                        />
                      </TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Recepción</TableHead>
                      <TableHead className="text-right">Resultados</TableHead>
                      <TableHead>Estado</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSamples.map((sample) => (
                      <TableRow key={sample.id}>
                        <TableCell>
                          <input
                            type="checkbox"
                            aria-label={`Agregar muestra ${sample.code}`}
                            checked={selectedSampleIds.has(sample.id)}
                            onChange={() => toggleSample(sample.id)}
                          />
                        </TableCell>
                        <TableCell className="font-medium">{sample.code}</TableCell>
                        <TableCell>{sample.clientName ?? '—'}</TableCell>
                        <TableCell>{sample.receivedAt}</TableCell>
                        <TableCell className="text-right">{sample.matchingResultCount}</TableCell>
                        <TableCell>{SOIL_SAMPLE_STATUS_LABELS[sample.status] ?? sample.status}</TableCell>
                      </TableRow>
                    ))}
                    {visibleSamples.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
                          {samples.length === 0
                            ? 'No hay muestras con resultados de esta matriz'
                            : 'Sin coincidencias'}
                        </TableCell>
                      </TableRow>
                    ) : null}
                  </TableBody>
                </Table>
              </div>
            )}
          </Card>
        ) : null}

        {payload ? (
          <>
            <SoilReportPayloadView payload={payload} />
            <div className="flex justify-end">
              <Button type="button" onClick={() => void createReport()} disabled={isSaving}>
                {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Crear informe'}
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}
