'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ArrowLeft, Loader2, Pencil, Save } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { fieldClassName, textareaClassName } from '@/components/ui/form-field-styles'
import { useAuth } from '@/hooks/useAuth'
import { formatSoilResultValue } from '@/lib/soil/formatResult'
import { SOIL_SAMPLE_STATUS_LABELS, type SoilSampleStatus } from '../soilLabels'
import {
  isSoilSampledBy,
  SOIL_SAMPLED_BY_LABELS,
  soilSampledByLabel,
  type SoilSampledBy,
} from '@/lib/soil/sampleIntake'

interface SoilSampleDetail {
  sample: {
    id: string
    code: string
    status: SoilSampleStatus
    receivedAt: string
    sampledAt: string
    sampledBy: string
    notes: string | null
    clientId: string | null
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

interface ClientOption {
  id: string
  name: string
}

interface SampleDraft {
  clientId: string
  code: string
  receivedAt: string
  sampledAt: string
  sampledBy: SoilSampledBy
  notes: string
}

function dateInputValue(value: string): string {
  return value.slice(0, 10)
}

function draftFromSample(sample: SoilSampleDetail['sample']): SampleDraft {
  return {
    clientId: sample.clientId ?? '',
    code: sample.code,
    receivedAt: dateInputValue(sample.receivedAt),
    sampledAt: dateInputValue(sample.sampledAt),
    sampledBy: isSoilSampledBy(sample.sampledBy) ? sample.sampledBy : 'client',
    notes: sample.notes ?? '',
  }
}

export default function SoilSampleDetailPage() {
  const { id: sampleId } = useParams<{ id: string }>()
  const { userRole } = useAuth()
  const isAdmin = userRole === 'admin'
  const [detail, setDetail] = useState<SoilSampleDetail | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [matrixFilter, setMatrixFilter] = useState<string | null>(null)
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [draft, setDraft] = useState<SampleDraft | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])

  useEffect(() => {
    setMatrixFilter(new URLSearchParams(window.location.search).get('matriz'))
  }, [])

  const loadDetail = useCallback(async () => {
    const response = await fetch(`/api/soil/samples/${sampleId}`)
    const data = await response.json()
    if (!response.ok) throw new Error(data.error || 'Error al cargar la muestra')
    setDetail(data)
  }, [sampleId])

  useEffect(() => {
    const load = async () => {
      try {
        await loadDetail()
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar la muestra')
      }
    }
    void load()
  }, [loadDetail])

  const startEditing = async () => {
    if (!detail) return
    setSaveError(null)
    setDraft(draftFromSample(detail.sample))
    setIsEditing(true)
    if (clients.length > 0) return
    try {
      const response = await fetch('/api/clients')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al cargar clientes')
      setClients(Array.isArray(data) ? data : [])
    } catch (loadError) {
      setSaveError(loadError instanceof Error ? loadError.message : 'Error al cargar clientes')
    }
  }

  const saveSample = async (event: React.FormEvent) => {
    event.preventDefault()
    if (!draft) return
    setSaveError(null)
    setIsSaving(true)
    try {
      const response = await fetch(`/api/soil/samples/${sampleId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          client_id: draft.clientId,
          code: draft.code.trim(),
          received_at: draft.receivedAt,
          sampled_at: draft.sampledAt,
          sampled_by: draft.sampledBy,
          notes: draft.notes.trim() || undefined,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la muestra')
      await loadDetail()
      setIsEditing(false)
    } catch (saveFailure) {
      setSaveError(saveFailure instanceof Error ? saveFailure.message : 'No se pudo actualizar la muestra')
    } finally {
      setIsSaving(false)
    }
  }

  const visibleSubsamples = detail?.subsamples ?? []
  const visibleAnalysisIds = new Set(
    visibleSubsamples.flatMap((subsample) => subsample.results.map((result) => result.analysisId))
  )
  const visibleAnalyses = (detail?.analyses ?? []).filter((analysis) => visibleAnalysisIds.has(analysis.id))
  const backHref = matrixFilter ? `/suelo/informes?matriz=${matrixFilter}` : '/suelo'
  const backLabel = matrixFilter ? 'Informes' : 'Muestras'
  const clientOptions =
    draft && draft.clientId && !clients.some((client) => client.id === draft.clientId)
      ? [{ id: draft.clientId, name: detail?.sample.clientName ?? 'Cliente actual' }, ...clients]
      : clients

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
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div className="flex flex-wrap items-center gap-3">
                <h1 className="text-2xl font-semibold tracking-tight text-foreground">Muestra {detail.sample.code}</h1>
                <Badge variant={detail.sample.status === 'completed' ? 'default' : 'secondary'}>
                  {SOIL_SAMPLE_STATUS_LABELS[detail.sample.status] ?? detail.sample.status}
                </Badge>
              </div>
              {isAdmin && !isEditing ? (
                <Button type="button" variant="outline" className="gap-1" onClick={() => void startEditing()}>
                  <Pencil className="h-4 w-4" />
                  Editar
                </Button>
              ) : null}
            </div>

            {saveError ? (
              <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{saveError}</div>
            ) : null}

            {isEditing && draft ? (
              <form onSubmit={(event) => void saveSample(event)}>
                <Card className="grid gap-4 p-4 sm:grid-cols-2">
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-soil-client">Cliente</Label>
                    <select
                      id="edit-soil-client"
                      value={draft.clientId}
                      onChange={(event) => setDraft({ ...draft, clientId: event.target.value })}
                      className={fieldClassName}
                      required
                    >
                      <option value="">Selecciona un cliente</option>
                      {clientOptions.map((client) => (
                        <option key={client.id} value={client.id}>
                          {client.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-soil-code">Código de muestra</Label>
                    <input
                      id="edit-soil-code"
                      inputMode="numeric"
                      value={draft.code}
                      onChange={(event) => setDraft({ ...draft, code: event.target.value })}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-soil-received">Fecha de recepción</Label>
                    <input
                      id="edit-soil-received"
                      type="date"
                      value={draft.receivedAt}
                      onChange={(event) => setDraft({ ...draft, receivedAt: event.target.value })}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-soil-sampled">Toma de muestra</Label>
                    <input
                      id="edit-soil-sampled"
                      type="date"
                      value={draft.sampledAt}
                      onChange={(event) => setDraft({ ...draft, sampledAt: event.target.value })}
                      className={fieldClassName}
                      required
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label htmlFor="edit-soil-sampled-by">Muestreado por</Label>
                    <select
                      id="edit-soil-sampled-by"
                      value={draft.sampledBy}
                      onChange={(event) =>
                        setDraft({ ...draft, sampledBy: event.target.value as SoilSampledBy })
                      }
                      className={fieldClassName}
                      required
                    >
                      <option value="client">{SOIL_SAMPLED_BY_LABELS.client}</option>
                      <option value="lab">{SOIL_SAMPLED_BY_LABELS.lab}</option>
                    </select>
                  </div>
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label htmlFor="edit-soil-notes">Observaciones</Label>
                    <textarea
                      id="edit-soil-notes"
                      rows={3}
                      value={draft.notes}
                      onChange={(event) => setDraft({ ...draft, notes: event.target.value })}
                      className={textareaClassName}
                    />
                  </div>
                  <div className="flex justify-end gap-2 sm:col-span-2">
                    <Button type="button" variant="outline" disabled={isSaving} onClick={() => setIsEditing(false)}>
                      Cancelar
                    </Button>
                    <Button type="submit" disabled={isSaving || !draft.clientId} className="gap-1">
                      {isSaving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Guardar
                    </Button>
                  </div>
                </Card>
              </form>
            ) : (
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
            )}

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
