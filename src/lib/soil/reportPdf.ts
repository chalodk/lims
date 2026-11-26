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
  recepcion: string
  muestreado_por: string
  condicion: string
  tipo: string
  analisis: SoilPdfAnalysisColumn[]
  filas: SoilPdfRow[]
}

/** Objeto que recorre la plantilla de PDFMonkey del informe de suelo. */
export interface SoilPdfMonkeyPayload {
  laboratorio: string
  /** URL https del logo de la company. Null si no tiene. */
  logo: string | null
  /** Un informe tiene un solo cliente. No se repite en cada muestra. */
  cliente: string
  rut_facturacion: string
  contacto: string
  email: string
  matriz: string
  fecha: string
  muestras: SoilPdfSample[]
}

const REPORT_TIME_ZONE = 'America/Santiago'

/** Plantilla de suelo en PDFMonkey. La variable de entorno la reemplaza sin tocar el código. */
export const SOIL_PDF_TEMPLATE_FALLBACK_ID = '5B8439FB-FA56-4DEF-9701-076475C0BF71'

export function resolveSoilPdfTemplateId(envValue: string | undefined): string {
  const configuredTemplateId = envValue?.trim()
  if (configuredTemplateId) return configuredTemplateId
  return SOIL_PDF_TEMPLATE_FALLBACK_ID
}

export function formatSoilReportTimestamp(value: string): string {
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return new Intl.DateTimeFormat('es-CL', {
    dateStyle: 'short',
    timeStyle: 'short',
    timeZone: REPORT_TIME_ZONE,
  }).format(parsed)
}

const SAMPLED_BY_LABELS: Record<string, string> = {
  client: 'Cliente',
  lab: 'Laboratorio',
}

const SAMPLE_CONDITION_LABELS: Record<string, string> = {
  apta: 'Apta para análisis',
  no_apta: 'No apta para análisis',
}

/** Fecha de recepción como «11 de noviembre de 2026», sin mover el día por la zona horaria. */
export function formatSoilReceptionDate(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value)
  if (!match) return value
  const date = new Date(Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]), 12))
  return new Intl.DateTimeFormat('es-CL', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(date)
}

function displayText(value: string | null | undefined): string {
  const trimmed = value?.trim()
  return trimmed ? trimmed : ''
}

/**
 * Traduce el informe guardado al payload de la plantilla.
 * No vuelve a leer resultados: usa títulos, unidades y valores ya congelados.
 */
/** Solo una URL https entra al informe. El resto se omite. */
export function soilReportLogoUrl(logoUrl: string | null | undefined): string | null {
  const trimmed = logoUrl?.trim()
  if (!trimmed || !trimmed.startsWith('https://')) return null
  return trimmed
}

const FILENAME_UNSAFE_CHARACTERS = /[\\/:*?"<>|\u0000-\u001f]+/g

function filenameToken(value: string, fallback: string): string {
  const token = value
    .trim()
    .replace(/\s+/g, '_')
    .replace(FILENAME_UNSAFE_CHARACTERS, '_')
    .replace(/_+/g, '_')
    .replace(/^_+|_+$/g, '')
  return token || fallback
}

/** Razón social y matriz: `Cliente_test_suelo.pdf`. */
export function soilReportPdfFilename(clientName: string, matrixName: string): string {
  const client = filenameToken(clientName, 'Sin_cliente')
  const matrix = filenameToken(matrixName, 'matriz').toLocaleLowerCase('es-CL')
  return `${client}_${matrix}.pdf`
}

export function buildSoilPdfMonkeyPayload(input: {
  payload: SoilReportPayload
  laboratoryName: string
  logoUrl?: string | null
  createdAt: string
}): SoilPdfMonkeyPayload {
  const storedClient = input.payload.client
  const clientName =
    displayText(storedClient?.name) ||
    input.payload.samples.find((sample) => sample.clientName)?.clientName ||
    'Sin cliente'
  return {
    laboratorio: input.laboratoryName,
    logo: soilReportLogoUrl(input.logoUrl),
    cliente: clientName,
    rut_facturacion: displayText(storedClient?.billingRut),
    contacto: displayText(storedClient?.contactName),
    email: displayText(storedClient?.contactEmail),
    matriz: input.payload.matrixName,
    fecha: formatSoilReportTimestamp(input.createdAt),
    muestras: input.payload.samples.map((sample) => {
      const analyses = analysesInSample(sample.subsamples)
      return {
        codigo: sample.code,
        recepcion: formatSoilReceptionDate(sample.receivedAt),
        muestreado_por: SAMPLED_BY_LABELS[sample.sampledBy ?? ''] ?? '',
        condicion: SAMPLE_CONDITION_LABELS[sample.condition ?? ''] ?? '',
        tipo: input.payload.matrixName,
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
