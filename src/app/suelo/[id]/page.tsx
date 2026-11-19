'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2 } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { formatSoilResultValue } from '@/lib/soil/formatResult'
import { SOIL_SAMPLE_STATUS_LABELS, type SoilSampleStatus } from '../soilLabels'
import { soilSampledByLabel } from '@/lib/soil/sampleIntake'

interface SoilSampleDetail {
  sample: {
    id: string
    code: string
    status: SoilSampleStatus
    receivedAt: string
    sampledAt: string
    sampledBy: string
    notes: string | null
    clientName: string | null
  }
  analyses: { id: string; reportTitle: string; unit: string | null }[]
  subsamples: {
    id: string
    number: number
    results: {
      analysisId: string
      valueNumeric: number | null
      valueQualifier: string | null
      valueText: string | null
      rawValue: string | null
      unit: string | null
      basis: string | null
    }[]
  }[]
}

export default function SoilSampleDetailPage() {
  const { id: sampleId } = useParams<{ id: string }>()
  const [detail, setDetail] = useState<SoilSampleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [matrixFilter, setMatrixFilter] = useState<string | null>(null)

  useEffect(() => {
    setMatrixFilter(new URLSearchParams(window.location.search).get('matriz'))
  }, [])

  useEffect(() => {
    const loadDetail = async () => {
      try {
        const response = await fetch(`/api/soil/samples/${sampleId}`)
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar la muestra')
        setDetail(data)
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar la muestra')
      }
    }
    void loadDetail()
  }, [sampleId])

  const visibleSubsamples = detail?.subsamples ?? []
  const visibleAnalysisIds = new Set(visibleSubsamples.flatMap((subsample) => subsample.results.map((result) => result.analysisId)))
  const visibleAnalyses = (detail?.analyses ?? []).filter((analysis) => visibleAnalysisIds.has(analysis.id))
  const backHref = matrixFilter ? `/suelo/informes?matriz=${matrixFilter}` : '/suelo'
  const backLabel = matrixFilter ? 'Informes' : 'Muestras de suelo'

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:p-6">
        <Link href={backHref} className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          {backLabel}
        </Link>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : !detail ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-6 w-6 animate-spin text-green-600" />
          </div>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Muestra {detail.sample.code}</h1>
              <Badge variant={detail.sample.status === 'completed' ? 'default' : 'secondary'}>
                {SOIL_SAMPLE_STATUS_LABELS[detail.sample.status] ?? detail.sample.status}
              </Badge>
            </div>
            <Card className="grid gap-3 p-4 text-sm sm:grid-cols-3">
              <DetailField label="Cliente" value={detail.sample.clientName} />
              <DetailField label="Recepción" value={detail.sample.receivedAt} />
              <DetailField label="Toma de muestra" value={detail.sample.sampledAt} />
              <DetailField label="Muestreado por" value={soilSampledByLabel(detail.sample.sampledBy)} />
              {detail.sample.notes ? (
                <div className="sm:col-span-3">
                  <DetailField label="Observaciones" value={detail.sample.notes} />
                </div>
              ) : null}
            </Card>

            <Card className="overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead className="sticky left-0 bg-white">Submuestra</TableHead>
                      {visibleAnalyses.map((analysis) => (
                        <TableHead key={analysis.id} className="whitespace-nowrap">
                          {analysis.reportTitle}
                          {analysis.unit ? (
                            <span className="block text-xs font-normal text-muted-foreground">{analysis.unit}</span>
                          ) : null}
                        </TableHead>
                      ))}
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleSubsamples.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={Math.max(visibleAnalyses.length, 1) + 1} className="py-8 text-center text-muted-foreground">
                          Esta muestra todavía no tiene resultados.
                        </TableCell>
                      </TableRow>
                    ) : null}
                    {visibleSubsamples.map((subsample) => {
                      const resultByAnalysisId = new Map(
                        subsample.results.map((result) => [result.analysisId, result])
                      )
                      return (
                        <TableRow key={subsample.id}>
                          <TableCell className="sticky left-0 bg-white font-medium">
                            {detail.sample.code}-{subsample.number}
                          </TableCell>
                          {visibleAnalyses.map((analysis) => {
                            const result = resultByAnalysisId.get(analysis.id)
                            return (
                              <TableCell
                                key={analysis.id}
                                className="whitespace-nowrap"
                                title={result?.rawValue ? `Celda: ${result.rawValue}` : undefined}
                              >
                                {result ? (
                                  <>
                                    {formatSoilResultValue(result)}
                                    {result.unit && result.unit !== analysis.unit ? (
                                      <span className="text-xs text-muted-foreground"> {result.unit}</span>
                                    ) : null}
                                  </>
                                ) : (
                                  <span className="text-muted-foreground">—</span>
                                )}
                              </TableCell>
                            )
                          })}
                        </TableRow>
                      )
                    })}
                  </TableBody>
                </Table>
              </div>
            </Card>
          </>
        )}
      </div>
    </DashboardLayout>
  )
}

function DetailField({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="text-foreground">{value ?? '—'}</p>
    </div>
  )
}
