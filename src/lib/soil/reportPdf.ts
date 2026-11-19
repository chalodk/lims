import type { SoilReportPayload } from './reportPayload'

export interface SoilPdfAnalysisColumn {
  titulo: string
  unidad: string | null
}

export interface SoilPdfRow {
  submuestra: string
  valores: string[]
}

export interface SoilPdfSample {
  codigo: string
  cliente: string
  recepcion: string
  analisis: SoilPdfAnalysisColumn[]
  filas: SoilPdfRow[]
}

/** Objeto que recorre la plantilla de PDFMonkey del informe de suelo. */
export interface SoilPdfMonkeyPayload {
  laboratorio: string
  matriz: string
  fecha: string
  muestras: SoilPdfSample[]
}

const REPORT_TIME_ZONE = 'America/Santiago'

export function formatSoilReportTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: REPORT_TIME_ZONE,
  }).format(parsed)
}

/**
 * Traduce el informe guardado al payload de la plantilla.
 * No vuelve a leer resultados: usa títulos, unidades y valores ya congelados.
 */
export function buildSoilPdfMonkeyPayload(input: {
  payload: SoilReportPayload
  laboratoryName: string
  createdAt: string
}): SoilPdfMonkeyPayload {
  return {
    laboratorio: input.laboratoryName,
    matriz: input.payload.matrixName,
    fecha: formatSoilReportTimestamp(input.createdAt),
    muestras: input.payload.samples.map((sample) => {
      const analyses = analysesInSample(sample.subsamples)
      return {
        codigo: sample.code,
        cliente: sample.clientName ?? 'Sin cliente',
        recepcion: sample.receivedAt,
        analisis: analyses.map((analysis) => ({
          titulo: analysis.reportTitle,
          unidad: analysis.unit,
        })),
        filas: sample.subsamples.map((subsample) => {
          const valueByAnalysisId = new Map(
            subsample.results.map((result) => [result.analysisId, result.displayValue])
          )
          return {
            submuestra: `${sample.code}-${subsample.number}`,
            valores: analyses.map((analysis) => valueByAnalysisId.get(analysis.analysisId) ?? ''),
          }
        }),
      }
    }),
  }
}

function analysesInSample(
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
