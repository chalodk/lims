'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { AlertTriangle, ArrowLeft, CheckCircle2, FileSpreadsheet, Loader2, Upload, XCircle } from 'lucide-react'
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
import { formatSoilResultValue } from '@/lib/soil/formatResult'

interface ImportIssue {
  severity: 'error' | 'warning'
  code: string
  sheetName: string
  rowNumber: number | null
  message: string
}

interface ImportColumnCheck {
  analysisId: string
  reportTitle: string
  sheetName: string
  column: string
  headerText: string | null
  resultCount: number
}

interface PreviewResult {
  sampleCode: string
  createsSample: boolean
  subsampleNumber: number
  analysisId: string
  analysisTitle: string
  valueNumeric: number | null
  valueQualifier: string | null
  valueText: string | null
  rawValue: string
  unit: string | null
  basis: string | null
  sheetName: string
  rowNumber: number
}

interface ImportPreviewResponse {
  hasErrors: boolean
  issues: ImportIssue[]
  columnChecks: ImportColumnCheck[]
  newSampleCodes: string[]
  ignoredRowCount: number
  resultCount: number
  sampleSummaries: { sampleId: string | null; sampleCode: string; resultCount: number; subsampleCount: number }[]
  results: PreviewResult[]
}

interface ClientOption {
  id: string
  name: string
}

function todayIsoDate(): string {
  const now = new Date()
  const localDate = new Date(now.getTime() - now.getTimezoneOffset() * 60000)
  return localDate.toISOString().slice(0, 10)
}

function formatIssueLocation(issue: ImportIssue): string {
  return issue.rowNumber ? `${issue.sheetName}, fila ${issue.rowNumber}` : issue.sheetName
}

export default function SoilImportPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [preview, setPreview] = useState<ImportPreviewResponse | null>(null)
  const [clients, setClients] = useState<ClientOption[]>([])
  const [clientId, setClientId] = useState('')
  const [isPreviewing, setIsPreviewing] = useState(false)
  const [isCommitting, setIsCommitting] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [commitMessage, setCommitMessage] = useState<string | null>(null)

  useEffect(() => {
    const loadClients = async () => {
      try {
        const response = await fetch('/api/clients')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar clientes')
        setClients(Array.isArray(data) ? data : [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar clientes')
      }
    }
    void loadClients()
  }, [])

  const sendWorkbook = async (mode: 'preview' | 'commit') => {
    if (!selectedFile) return null
    const formData = new FormData()
    formData.append('file', selectedFile)
    formData.append('mode', mode)
    formData.append('received_at', todayIsoDate())
    if (clientId) formData.append('client_id', clientId)
    const response = await fetch('/api/soil/imports', { method: 'POST', body: formData })
    const data = await response.json()
    if (!response.ok) {
      const firstIssue = (data.issues as ImportIssue[] | undefined)?.[0]
      throw new Error(
        firstIssue ? `${data.error}. ${formatIssueLocation(firstIssue)}: ${firstIssue.message}` : data.error
      )
    }
    return data
  }

  const handlePreview = async () => {
    setError(null)
    setCommitMessage(null)
    setPreview(null)
    setIsPreviewing(true)
    try {
      setPreview(await sendWorkbook('preview'))
    } catch (previewError) {
      setError(previewError instanceof Error ? previewError.message : 'No se pudo leer la planilla')
    } finally {
      setIsPreviewing(false)
    }
  }

  const handleCommit = async () => {
    setError(null)
    setIsCommitting(true)
    try {
      const commitResult = await sendWorkbook('commit')
      setCommitMessage(
        `Se guardaron ${commitResult.savedResultCount} resultados en ${commitResult.touchedSampleCount} muestra(s).`
      )
      setPreview(null)
      setSelectedFile(null)
    } catch (commitError) {
      setError(commitError instanceof Error ? commitError.message : 'No se pudo guardar')
    } finally {
      setIsCommitting(false)
    }
  }

  const errorIssues = preview?.issues.filter((issue) => issue.severity === 'error') ?? []
  const warningIssues = preview?.issues.filter((issue) => issue.severity === 'warning') ?? []

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <Link href="/suelo" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground">
          <ArrowLeft className="h-4 w-4" />
          Muestras de suelo
        </Link>
        <div className="flex items-start gap-3">
          <div className="rounded-lg bg-green-100 p-2">
            <FileSpreadsheet className="h-6 w-6 text-green-700" />
          </div>
          <div>
            <h1 className="text-2xl font-semibold tracking-tight text-foreground">Importar resultados</h1>
            <p className="text-sm text-muted-foreground">
              Los resultados se anexan a la muestra con el mismo número. Si el número no existe, se crea
              la muestra con el cliente que elijas.
            </p>
          </div>
        </div>

        <Card className="flex flex-wrap items-center gap-3 p-4">
          <input
            type="file"
            accept=".xlsx"
            onChange={(event) => {
              setSelectedFile(event.target.files?.[0] ?? null)
              setPreview(null)
              setCommitMessage(null)
            }}
            className="text-sm"
            aria-label="Planilla de resultados"
          />
          <Button type="button" onClick={() => void handlePreview()} disabled={!selectedFile || isPreviewing} className="gap-1">
            {isPreviewing ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
            Revisar planilla
          </Button>
        </Card>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {commitMessage ? (
          <div className="flex items-center gap-2 rounded-md border border-green-200 bg-green-50 px-4 py-3 text-sm text-green-700">
            <CheckCircle2 className="h-4 w-4" />
            {commitMessage}
          </div>
        ) : null}

        {preview ? (
          <>
            <div className="grid gap-3 sm:grid-cols-4">
              <SummaryTile label="Resultados a guardar" value={preview.resultCount} />
              <SummaryTile label="Muestras" value={preview.sampleSummaries.length} />
              <SummaryTile label="Errores" value={errorIssues.length} tone={errorIssues.length ? 'error' : 'neutral'} />
              <SummaryTile label="Advertencias" value={warningIssues.length} tone={warningIssues.length ? 'warning' : 'neutral'} />
            </div>

            {errorIssues.length > 0 ? (
              <IssueList
                title="Errores (estas filas no se guardan; corrígelas y vuelve a cargar el archivo)"
                issues={errorIssues}
                tone="error"
              />
            ) : null}
            {warningIssues.length > 0 ? (
              <IssueList title="Advertencias" issues={warningIssues} tone="warning" />
            ) : null}

            {preview.newSampleCodes.length > 0 ? (
              <Card className="space-y-3 p-4 text-sm">
                <p className="font-medium">
                  Estas muestras no existen y se van a crear ({preview.newSampleCodes.length}). El cliente se
                  asigna solo a ellas; las que ya estaban registradas no cambian.
                </p>
                <p className="break-words text-muted-foreground">{preview.newSampleCodes.join(', ')}</p>
                <div className="max-w-sm space-y-1.5">
                  <Label htmlFor="import-client">Cliente de las muestras nuevas</Label>
                  <select
                    id="import-client"
                    value={clientId}
                    onChange={(event) => setClientId(event.target.value)}
                    className={fieldClassName}
                    required
                  >
                    <option value="">Selecciona un cliente</option>
                    {clients.map((client) => (
                      <option key={client.id} value={client.id}>
                        {client.name}
                      </option>
                    ))}
                  </select>
                </div>
              </Card>
            ) : null}

            {preview.columnChecks.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium">
                  Columnas leídas (confirma que el encabezado corresponde al análisis)
                </div>
                <div className="max-h-80 overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Análisis</TableHead>
                        <TableHead>Pestaña</TableHead>
                        <TableHead>Columna</TableHead>
                        <TableHead>Encabezado en la planilla</TableHead>
                        <TableHead className="text-right">Resultados</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.columnChecks.map((columnCheck) => (
                        <TableRow key={columnCheck.analysisId}>
                          <TableCell>{columnCheck.reportTitle}</TableCell>
                          <TableCell>{columnCheck.sheetName}</TableCell>
                          <TableCell>{columnCheck.column}</TableCell>
                          <TableCell className="text-muted-foreground">{columnCheck.headerText ?? '—'}</TableCell>
                          <TableCell className="text-right">{columnCheck.resultCount}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : null}

            {preview.results.length > 0 ? (
              <Card className="overflow-hidden">
                <div className="border-b border-gray-100 px-4 py-3 text-sm font-medium">
                  Vista previa de resultados
                  {preview.results.length < preview.resultCount
                    ? ` (primeros ${preview.results.length} de ${preview.resultCount})`
                    : ''}
                </div>
                <div className="max-h-[28rem] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Muestra</TableHead>
                        <TableHead>Submuestra</TableHead>
                        <TableHead>Análisis</TableHead>
                        <TableHead>Valor</TableHead>
                        <TableHead>Unidad</TableHead>
                        <TableHead>Base</TableHead>
                        <TableHead>Origen</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {preview.results.map((result) => (
                        <TableRow key={`${result.sampleCode}-${result.subsampleNumber}-${result.analysisId}`}>
                          <TableCell>{result.sampleCode}</TableCell>
                          <TableCell>{result.subsampleNumber}</TableCell>
                          <TableCell>
                            {result.analysisTitle}
                            {result.createsSample ? (
                              <span className="block text-xs text-muted-foreground">Muestra nueva</span>
                            ) : null}
                          </TableCell>
                          <TableCell title={`Celda: ${result.rawValue}`}>{formatSoilResultValue(result)}</TableCell>
                          <TableCell>{result.unit ?? '—'}</TableCell>
                          <TableCell>{result.basis ?? '—'}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {result.sheetName}, fila {result.rowNumber}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </Card>
            ) : null}

            <div className="flex justify-end">
              <Button
                type="button"
                onClick={() => void handleCommit()}
                disabled={
                  preview.resultCount === 0 ||
                  isCommitting ||
                  (preview.newSampleCodes.length > 0 && !clientId)
                }
                className="gap-1"
              >
                {isCommitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                Guardar {preview.resultCount} resultados
              </Button>
            </div>
          </>
        ) : null}
      </div>
    </DashboardLayout>
  )
}

function SummaryTile({
  label,
  value,
  tone = 'neutral',
}: {
  label: string
  value: number
  tone?: 'neutral' | 'error' | 'warning'
}) {
  const toneClassName =
    tone === 'error' ? 'text-red-700' : tone === 'warning' ? 'text-amber-700' : 'text-foreground'
  return (
    <Card className="p-4">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className={`text-2xl font-semibold ${toneClassName}`}>{value}</p>
    </Card>
  )
}

function IssueList({ title, issues, tone }: { title: string; issues: ImportIssue[]; tone: 'error' | 'warning' }) {
  const Icon = tone === 'error' ? XCircle : AlertTriangle
  const toneClassName =
    tone === 'error' ? 'border-red-200 bg-red-50 text-red-800' : 'border-amber-200 bg-amber-50 text-amber-800'
  return (
    <div className={`rounded-md border px-4 py-3 text-sm ${toneClassName}`}>
      <p className="mb-2 flex items-center gap-1 font-medium">
        <Icon className="h-4 w-4" />
        {title}
      </p>
      <ul className="max-h-64 space-y-1 overflow-auto">
        {issues.map((issue, issueIndex) => (
          <li key={`${issue.code}-${issue.sheetName}-${issue.rowNumber}-${issueIndex}`}>
            <span className="font-medium">{formatIssueLocation(issue)}:</span> {issue.message}
          </li>
        ))}
      </ul>
    </div>
  )
}
