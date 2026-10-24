import { parseFindingsRecord, readSintomatologia } from '@/lib/results/phytopathologyFindings'

export interface IsolationResultadoInput {
  findings?: unknown
  samples?: { code?: string | null } | null
}

export interface IsolationResultadoRow {
  numeroMuestra: string
  identificacionMuestra: string
  tejidoAnalizado: string
  microorganismosAislados: string[]
}

export interface IsolationReportPayloadInput {
  numeroInforme: string
  tituloInforme: string
  informacionSolicitante: Record<string, string>
  tipoMuestraDescripcion: string
  metodologiaDescripcion: string
  diagnosticoDescripcion: string
  sintomatologiaDescripcion: string
  notaResultados: string
  columnLabels: Record<string, string>
  analista: Record<string, string>
  resultados: IsolationResultadoRow[]
}

function readMicroorganismNames(value: unknown): string[] {
  if (!Array.isArray(value)) return []
  return value
    .map((item) => {
      if (!item || typeof item !== 'object') return ''
      const name = (item as Record<string, unknown>).name
      return typeof name === 'string' ? name.trim() : ''
    })
    .filter((name) => name !== '')
}

export function mapIsolationResultados(
  resultados: IsolationResultadoInput[]
): IsolationResultadoRow[] {
  const rows: IsolationResultadoRow[] = []

  resultados.forEach((resultado) => {
    const record = parseFindingsRecord(resultado.findings)
    const tests = Array.isArray(record?.tests) ? record.tests : []

    tests.forEach((test) => {
      if (!test || typeof test !== 'object') return
      const row = test as Record<string, unknown>
      const sampleCode = resultado.samples?.code?.trim() || ''
      const sampleNumber = typeof row.sampleNumber === 'string' ? row.sampleNumber.trim() : ''
      const identification = typeof row.identification === 'string' ? row.identification.trim() : ''
      const tissue = typeof row.tissue === 'string' ? row.tissue.trim() : ''
      const microorganisms = readMicroorganismNames(row.microorganisms)

      if (!sampleNumber && !identification && !tissue && microorganisms.length === 0) return

      rows.push({
        numeroMuestra: sampleNumber || sampleCode || String(rows.length + 1),
        identificacionMuestra: identification || sampleCode || `Muestra ${rows.length + 1}`,
        tejidoAnalizado: tissue,
        microorganismosAislados: microorganisms,
      })
    })
  })

  if (rows.length === 0) {
    return [
      {
        numeroMuestra: '1',
        identificacionMuestra: 'Muestra 1',
        tejidoAnalizado: '',
        microorganismosAislados: ['No se aislaron microorganismos'],
      },
    ]
  }

  return rows
}

export function joinSintomatologia(
  resultados: Array<{ findings?: unknown }>
): string {
  return resultados
    .map((resultado) => readSintomatologia(resultado.findings).trim())
    .filter((value) => value !== '')
    .join('\n')
}

export function wrapHtmlPreservingWhitespaceForPdf(html: string | null | undefined): string {
  if (html == null || html.trim() === '') return ''
  return `<div style="white-space:pre-wrap;">${html}</div>`
}

export function buildIsolationReportPayload(
  input: IsolationReportPayloadInput
): Record<string, unknown> {
  return {
    numeroInforme: input.numeroInforme,
    tituloInforme: input.tituloInforme,
    formatoTabla: 'aislamiento',
    informacionSolicitante: input.informacionSolicitante,
    tipoMuestra: { descripcion: input.tipoMuestraDescripcion },
    metodologia: { descripcion: input.metodologiaDescripcion },
    resultados: input.resultados,
    sintomatologia: {
      descripcion: wrapHtmlPreservingWhitespaceForPdf(input.sintomatologiaDescripcion),
    },
    diagnostico: {
      descripcion: wrapHtmlPreservingWhitespaceForPdf(input.diagnosticoDescripcion),
    },
    notaResultados: input.notaResultados,
    columnLabels: input.columnLabels,
    analista: input.analista,
  }
}
