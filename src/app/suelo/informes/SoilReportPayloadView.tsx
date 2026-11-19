import { Card } from '@/components/ui/card'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'

export default function SoilReportPayloadView({ payload }: { payload: SoilReportPayload }) {
  if (payload.samples.length === 0) {
    return <p className="text-sm text-muted-foreground">No hay resultados de {payload.matrixName} en esta selección.</p>
  }

  return (
    <div className="space-y-4">
      {payload.samples.map((sample) => {
        const analyses = uniqueAnalyses(sample.subsamples)
        return (
          <Card key={sample.id} className="overflow-hidden">
            <div className="border-b border-gray-100 px-4 py-3 text-sm">
              <p className="font-medium">Muestra {sample.code}</p>
              <p className="text-muted-foreground">
                {sample.clientName ?? 'Sin cliente'} · Recepción {sample.receivedAt}
              </p>
            </div>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-white">Submuestra</TableHead>
                    {analyses.map((analysis) => (
                      <TableHead key={analysis.analysisId} className="whitespace-nowrap">
                        {analysis.reportTitle}
                        {analysis.unit ? (
                          <span className="block text-xs font-normal text-muted-foreground">{analysis.unit}</span>
                        ) : null}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sample.subsamples.map((subsample) => {
                    const resultByAnalysisId = new Map(subsample.results.map((result) => [result.analysisId, result]))
                    return (
                      <TableRow key={subsample.number}>
                        <TableCell className="sticky left-0 bg-white font-medium">
                          {sample.code}-{subsample.number}
                        </TableCell>
                        {analyses.map((analysis) => (
                          <TableCell key={analysis.analysisId} className="whitespace-nowrap">
                            {resultByAnalysisId.get(analysis.analysisId)?.displayValue ?? '—'}
                          </TableCell>
                        ))}
                      </TableRow>
                    )
                  })}
                </TableBody>
              </Table>
            </div>
          </Card>
        )
      })}
    </div>
  )
}

function uniqueAnalyses(
  subsamples: SoilReportPayload['samples'][number]['subsamples']
): { analysisId: string; reportTitle: string; unit: string | null }[] {
  const analyses = new Map<string, { analysisId: string; reportTitle: string; unit: string | null }>()
  for (const subsample of subsamples) {
    for (const result of subsample.results) {
      if (!analyses.has(result.analysisId)) {
        analyses.set(result.analysisId, {
          analysisId: result.analysisId,
          reportTitle: result.reportTitle,
          unit: result.unit,
        })
      }
    }
  }
  return [...analyses.values()]
}
