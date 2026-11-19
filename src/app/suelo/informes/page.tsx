'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { FileText, Loader2, Plus } from 'lucide-react'
import DashboardLayout from '@/components/layout/DashboardLayout'
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

interface SoilReportListItem {
  id: string
  createdAt: string
  matrixName: string | null
  sampleCount: number
}

function formatReportDate(value: string): string {
  return new Date(value).toLocaleString('es-CL', { dateStyle: 'short', timeStyle: 'short' })
}

export default function SoilReportsPage() {
  const [reports, setReports] = useState<SoilReportListItem[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    const loadReports = async () => {
      try {
        const response = await fetch('/api/soil/reports')
        const data = await response.json()
        if (!response.ok) throw new Error(data.error || 'Error al cargar informes')
        setReports(data.reports || [])
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : 'Error al cargar informes')
      } finally {
        setIsLoading(false)
      }
    }
    void loadReports()
  }, [])

  return (
    <DashboardLayout>
      <div className="mx-auto max-w-6xl space-y-6 p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="rounded-lg bg-green-100 p-2">
              <FileText className="h-6 w-6 text-green-700" />
            </div>
            <div>
              <h1 className="text-2xl font-semibold tracking-tight text-foreground">Informes de suelo</h1>
              <p className="text-sm text-muted-foreground">
                Cada informe elige una matriz y las muestras cuyos análisis aplican a esa matriz.
              </p>
            </div>
          </div>
          <Button asChild className="gap-1">
            <Link href="/suelo/informes/nuevo">
              <Plus className="h-4 w-4" />
              Crear informe
            </Link>
          </Button>
        </div>

        {error ? (
          <div className="rounded-md border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div>
        ) : null}

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-green-600" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Matriz</TableHead>
                    <TableHead>Creado</TableHead>
                    <TableHead className="text-right">Muestras</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reports.map((report) => (
                    <TableRow key={report.id}>
                      <TableCell className="font-medium">
                        <Link href={`/suelo/informes/${report.id}`} className="text-green-700 hover:underline">
                          {report.matrixName ?? 'Informe'}
                        </Link>
                      </TableCell>
                      <TableCell>{formatReportDate(report.createdAt)}</TableCell>
                      <TableCell className="text-right">{report.sampleCount}</TableCell>
                    </TableRow>
                  ))}
                  {reports.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                        Aún no hay informes de suelo
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
