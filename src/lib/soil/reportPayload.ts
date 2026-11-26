import { formatSoilResultValue } from './formatResult'
import { normalizeUnitLabel } from './units'
import type { SoilReportSet } from './sheetLayouts'

export interface ReportPayloadAnalysis {
  id: string
  reportTitle: string
  unit: string | null
  sortOrder: number
  matrixIds: string[]
  /** producto entra siempre. elemental solo en la caracterización completa. */
  reportSet?: SoilReportSet
}

export interface ReportPayloadResultInput {
  analysisId: string
  valueNumeric: number | null
  valueQualifier: string | null
  valueText: string | null
  unit: string | null
}

export interface ReportPayloadSampleInput {
  id: string
  code: string
  clientName: string | null
  billingRut?: string | null
  contactName?: string | null
  contactEmail?: string | null
  receivedAt: string
  sampledBy?: string | null
  condition?: string | null
  subsamples: { number: number; results: ReportPayloadResultInput[] }[]
}

export interface SoilReportResult {
  analysisId: string
  reportTitle: string
  unit: string | null
  valueNumeric: number | null
  valueQualifier: string | null
  valueText: string | null
  displayValue: string
}

/** Datos del único cliente del informe, congelados al generarlo. */
export interface SoilReportClient {
  name: string | null
  billingRut: string | null
  contactName: string | null
  contactEmail: string | null
}

export interface SoilReportPayload {
  matrixId: string
  matrixName: string
  client?: SoilReportClient
  samples: {
    id: string
    code: string
    clientName: string | null
    receivedAt: string
    sampledBy?: string | null
    condition?: string | null
    subsamples: { number: number; results: SoilReportResult[] }[]
  }[]
}

export type SoilReportMode = 'producto' | 'elemental'

function isCmolUnit(unit: string | null): boolean {
  return normalizeUnitLabel(unit).startsWith('cmol')
}

function isMilligramPerKilogram(unit: string | null): boolean {
  return normalizeUnitLabel(unit) === 'mg/kg'
}

/**
 * Deja en el informe los resultados de la matriz.
 * El modo producto omite los balances elementales.
 * Si un título tiene cmol/kg y mg/kg, el informe de suelo se queda con cmol/kg
 * salvo que se pidan los miligramos.
 * Una muestra sin resultados no entra.
 */
export function buildSoilReportPayload(input: {
  matrixId: string
  matrixName: string
  analyses: ReportPayloadAnalysis[]
  samples: ReportPayloadSampleInput[]
  reportMode?: SoilReportMode
  includeMilligramsPerKilogram?: boolean
}): SoilReportPayload {
  const reportMode = input.reportMode ?? 'producto'
  const includeMilligramsPerKilogram = input.includeMilligramsPerKilogram ?? false
  const analysesById = new Map(input.analyses.map((analysis) => [analysis.id, analysis]))

  const samples = input.samples.flatMap((sample) => {
    const subsamples = sample.subsamples.flatMap((subsample) => {
      const results = subsample.results.flatMap((result) => {
        const analysis = analysesById.get(result.analysisId)
        if (!analysis || !analysis.matrixIds.includes(input.matrixId)) return []
        if (analysis.reportSet === 'elemental' && reportMode !== 'elemental') return []
        return [
          {
            analysisId: analysis.id,
            reportTitle: analysis.reportTitle,
            unit: analysis.unit,
            valueNumeric: result.valueNumeric,
            valueQualifier: result.valueQualifier,
            valueText: result.valueText,
            displayValue: formatSoilResultValue(result),
          },
        ]
      })
      const titlesWithCmol = new Set(
        results.filter((result) => isCmolUnit(result.unit)).map((result) => result.reportTitle)
      )
      const titlesWithMilligrams = new Set(
        results.filter((result) => isMilligramPerKilogram(result.unit)).map((result) => result.reportTitle)
      )
      const chosen = results.filter((result) => {
        const hasBothUnits = titlesWithCmol.has(result.reportTitle) && titlesWithMilligrams.has(result.reportTitle)
        if (!hasBothUnits) return true
        if (includeMilligramsPerKilogram) return isMilligramPerKilogram(result.unit)
        return isCmolUnit(result.unit)
      })
      chosen.sort((left, right) => {
        const leftOrder = analysesById.get(left.analysisId)?.sortOrder ?? 0
        const rightOrder = analysesById.get(right.analysisId)?.sortOrder ?? 0
        return leftOrder - rightOrder
      })
      return chosen.length > 0 ? [{ number: subsample.number, results: chosen }] : []
    })
    subsamples.sort((left, right) => left.number - right.number)
    if (subsamples.length === 0) return []
    return [
      {
        id: sample.id,
        code: sample.code,
        clientName: sample.clientName,
        receivedAt: sample.receivedAt,
        sampledBy: sample.sampledBy ?? null,
        condition: sample.condition ?? null,
        subsamples,
      },
    ]
  })

  const clientSample = samples.find((sample) => sample.clientName) ?? samples[0]
  const clientSource = input.samples.find((sample) => sample.id === clientSample?.id)
  return {
    matrixId: input.matrixId,
    matrixName: input.matrixName,
    client: {
      name: clientSource?.clientName ?? null,
      billingRut: clientSource?.billingRut ?? null,
      contactName: clientSource?.contactName ?? null,
      contactEmail: clientSource?.contactEmail ?? null,
    },
    samples,
  }
}
