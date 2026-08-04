'use client'

import Link from 'next/link'
import { AlertTriangle, FileText } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'

export type DetectionRow = {
  id: string
  sampleCode: string
  pathogenName: string
  quantity: string | null
  testAreaLabel: string
  isSagZeroTolerance: boolean
  reportId: string | null
  createdAt: string
}

type DetectionsTableProps = {
  rows: DetectionRow[]
  hasNormalizedFindings: boolean
  onOpenReport?: (reportId: string) => void
}

function formatDate(value: string): string {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleDateString('es-CL')
}

export function DetectionsTable({
  rows,
  hasNormalizedFindings,
  onOpenReport,
}: DetectionsTableProps) {
  if (!hasNormalizedFindings) {
    return (
      <Card className="border-amber-200 bg-amber-50">
        <CardContent className="space-y-1 py-6 text-sm text-amber-950">
          <div className="flex items-center gap-2 font-medium">
            <AlertTriangle className="h-4 w-4" />
            Sin marcas SAG registradas aún
          </div>
          <p>
            Cuando el laboratorio marque tolerancia cero en los resultados, las detecciones aparecerán aquí.
            No interpretes la ausencia de filas como “todo controlado”.
          </p>
        </CardContent>
      </Card>
    )
  }

  if (rows.length === 0) {
    return (
      <Card>
        <CardContent className="py-8 text-center text-sm text-muted-foreground">
          No hay detecciones en el período seleccionado.
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className="overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Muestra</TableHead>
            <TableHead>Patógeno</TableHead>
            <TableHead>Cantidad</TableHead>
            <TableHead>Disciplina</TableHead>
            <TableHead>Tol. cero SAG</TableHead>
            <TableHead>Fecha</TableHead>
            <TableHead>Informe</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-mono text-sm">{row.sampleCode}</TableCell>
              <TableCell>{row.pathogenName}</TableCell>
              <TableCell className="font-mono text-sm">{row.quantity || '—'}</TableCell>
              <TableCell>{row.testAreaLabel}</TableCell>
              <TableCell>
                {row.isSagZeroTolerance ? (
                  <Badge variant="destructive">Crítico</Badge>
                ) : (
                  <Badge variant="secondary" className="bg-primary/10 text-primary">
                    Controlado
                  </Badge>
                )}
              </TableCell>
              <TableCell>{formatDate(row.createdAt)}</TableCell>
              <TableCell>
                {row.reportId ? (
                  onOpenReport ? (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => onOpenReport(row.reportId!)}
                      className="gap-1 text-primary"
                    >
                      <FileText className="h-4 w-4" />
                      Ver
                    </Button>
                  ) : (
                    <Button variant="ghost" size="sm" asChild className="gap-1 text-primary">
                      <Link href={`/reports?report=${row.reportId}`}>
                        <FileText className="h-4 w-4" />
                        Ver
                      </Link>
                    </Button>
                  )
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </Card>
  )
}
