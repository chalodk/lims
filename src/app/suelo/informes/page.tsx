'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Eye, FileText, Loader2, Plus, Search } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
import SoilReportPreviewDialog from '@/components/soil/SoilReportPreviewDialog'
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
import { useAuth } from '@/hooks/useAuth'
import { reportMatchesSampleCode } from '@/lib/soil/reportSampleCodes'
import { fieldClassName } from '@/components/ui/form-field-styles'

interface SoilReportListItem {
  id: string
  createdAt: string
  matrixName: string | null
  sampleCount: number
  sampleCodes: string[]
  source: 'reports' | 'soil_reports'
  completed: boolean
  renderedPdfUrl: string | null
  downloadUrl: string | null
}

function formatReportDate(value: string): string {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SoilReportsPage() {
  const { userRole } = useAuth()
  const isConsumer = userRole === 'consumidor'
  const canValidate = userRole === 'admin' || userRole === 'validador'
  const [reports, setReports] = useState<SoilReportListItem[]>([])
  const [codeSearch, setCodeSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [actionError, setActionError] = useState<string | null>(null)
  const [pendingReportId, setPendingReportId] = useState<string | null>(null)
  const [preview, setPreview] = useState<{
    renderedPdfUrl: string | null
    downloadUrl: string | null
    isLoading: boolean
  } | null>(null)

  const loadReports = useCallback(async () => {
    try {
      const response = await fetch('/api/soil/reports')
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'Error al cargar informes')
      setReports(data.reports || [])
      setError(null)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : 'Error al cargar informes')
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    void loadReports()
  }, [loadReports])

  const openPreview = async (report: SoilReportListItem) => {
    const secureUrl = report.renderedPdfUrl?.startsWith('https://') ? report.renderedPdfUrl : null
    if (secureUrl) {
      setPreview({ renderedPdfUrl: secureUrl, downloadUrl: report.downloadUrl, isLoading: false })
      return
    }

    setActionError(null)
    setPendingReportId(report.id)
    setPreview({ renderedPdfUrl: null, downloadUrl: report.downloadUrl, isLoading: true })
    try {
      const response = await fetch(`/api/soil/reports/${report.id}/pdf`, { method: 'POST' })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo generar el PDF')
      const renderedPdfUrl = typeof data.renderedPdfUrl === 'string' ? data.renderedPdfUrl : null
      const downloadUrl = typeof data.downloadUrl === 'string' ? data.downloadUrl : null
      setPreview({ renderedPdfUrl, downloadUrl, isLoading: false })
      if (report.source === 'reports') void loadReports()
    } catch (previewError) {
      setPreview(null)
      setActionError(previewError instanceof Error ? previewError.message : 'No se pudo generar el PDF')
    } finally {
      setPendingReportId(null)
    }
  }

  const setValidation = async (report: SoilReportListItem, status: 'validated' | 'draft') => {
    setActionError(null)
    setPendingReportId(report.id)
    try {
      const response = await fetch(`/api/soil/reports/${report.id}/validation`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || 'No se pudo actualizar la validación')
      await loadReports()
    } catch (validationError) {
      setActionError(validationError instanceof Error ? validationError.message : 'No se pudo actualizar la validación')
    } finally {
      setPendingReportId(null)
    }
  }

  const visibleReports = reports.filter((report) =>
    reportMatchesSampleCode(report.sampleCodes ?? [], codeSearch)
  )

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <FileText className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Informes</h1>
              <p className="text-sm text-muted-foreground">
                Cada informe elige una matriz y las muestras cuyos análisis aplican a esa matriz.
              </p>
            </div>
          </div>
          {isConsumer ? null : (
            <Button asChild className="gap-1">
              <Link href="/suelo/informes/nuevo">
                <Plus className="h-4 w-4" />
                Crear informe
              </Link>
            </Button>
          )}
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}
        {actionError ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{actionError}</div>
        ) : null}

        <Card className="overflow-hidden">
          <div className="border-b px-4 py-3">
            <div className="relative max-w-sm">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="search"
                value={codeSearch}
                onChange={(event) => setCodeSearch(event.target.value)}
                placeholder="Buscar por código de muestra"
                className={`${fieldClassName} pl-9`}
                aria-label="Buscar por código de muestra"
              />
            </div>
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
                    <TableHead>Informe</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Muestras</TableHead>
                    <TableHead className="text-right">Acciones</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visibleReports.map((report) => {
                    const isPending = pendingReportId === report.id
                    return (
                      <TableRow key={`${report.source}-${report.id}`}>
                        <TableCell className="font-medium">
                          <Link href={`/suelo/informes/${report.id}`} className="text-green-700 hover:underline">
                            Informe
                          </Link>
                          <p className="text-xs text-muted-foreground">
                            {(report.sampleCodes ?? []).length > 0
                              ? report.sampleCodes.join(', ')
                              : 'Sin códigos'}
                          </p>
                          {report.source === 'reports' ? (
                            <p className="text-xs text-muted-foreground">
                              {report.completed ? 'Validado' : 'Borrador'}
                            </p>
                          ) : null}
                        </TableCell>
                        <TableCell>{formatReportDate(report.createdAt)}</TableCell>
                        <TableCell className="text-right">{report.sampleCount}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon-sm"
                              title="Ver"
                              disabled={isPending || (isConsumer && !report.renderedPdfUrl?.startsWith('https://'))}
                              onClick={() => void openPreview(report)}
                            >
                              {isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Eye className="h-4 w-4" />}
                            </Button>
                            {canValidate && report.source === 'reports' ? (
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                disabled={isPending}
                                onClick={() =>
                                  void setValidation(report, report.completed ? 'draft' : 'validated')
                                }
                              >
                                {report.completed ? 'Quitar validación' : 'Validar'}
                              </Button>
                            ) : null}
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
                  {visibleReports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        {reports.length === 0 ? 'Aún no hay informes' : 'Ningún informe coincide con ese código'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                </TableBody>
              </Table>
            </div>
          )}
        </Card>
      </div>
      <SoilReportPreviewDialog
        open={preview !== null}
        onOpenChange={(open) => {
          if (!open) setPreview(null)
        }}
        renderedPdfUrl={preview?.renderedPdfUrl ?? null}
        downloadUrl={preview?.downloadUrl ?? null}
        isLoading={preview?.isLoading ?? false}
      />
    </DashboardLayout>
  )
}
