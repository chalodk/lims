export const COLONY_COUNT_TABLE_FORMAT = 'colony_count'
export const TISSUE_ISOLATION_TABLE_FORMAT = 'tissue_isolation'
export const PHYTOPATHOLOGY_ISOLATION_ANALYSIS_TYPE = 'phytopathology_isolation'

export const MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE =
  'No se puede generar un informe que mezcle recuento por dilución y aislamiento por tejido. Generá un informe por cada formato.'

export type PhytopathologyTableFormat =
  | typeof COLONY_COUNT_TABLE_FORMAT
  | typeof TISSUE_ISOLATION_TABLE_FORMAT

export type PhytopathologyReportVariant = PhytopathologyTableFormat | 'mixed'

export interface IsolationMicroorganism {
  name: string
  is_sag_zero_tolerance: boolean
}

export interface IsolationTestRow {
  sampleNumber: string
  identification: string
  tissue: string
  microorganisms: IsolationMicroorganism[]
}

export interface PhytopathologyResultLike {
  findings?: unknown
  test_area?: string | null
}

export function parseFindingsRecord(findings: unknown): Record<string, unknown> | null {
  if (findings == null) return null
  if (typeof findings === 'string') {
    try {
      const parsed: unknown = JSON.parse(findings)
      return typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)
        ? (parsed as Record<string, unknown>)
        : null
    } catch {
      return null
    }
  }
  if (typeof findings === 'object' && !Array.isArray(findings)) {
    return findings as Record<string, unknown>
  }
  return null
}

export function readPhytopathologyTableFormat(findings: unknown): PhytopathologyTableFormat {
  const record = parseFindingsRecord(findings)
  if (record?.tableFormat === TISSUE_ISOLATION_TABLE_FORMAT) {
    return TISSUE_ISOLATION_TABLE_FORMAT
  }
  return COLONY_COUNT_TABLE_FORMAT
}

export function isPhytopathologyResult(result: PhytopathologyResultLike): boolean {
  const area = (result.test_area || '').toLowerCase()
  if (area.includes('fitopatolog')) return true
  const record = parseFindingsRecord(result.findings)
  return record?.type === 'fitopatologia'
}

export function resolvePhytopathologyReportVariant(
  resultados: PhytopathologyResultLike[]
): PhytopathologyReportVariant | null {
  const phytopathologyResults = resultados.filter(isPhytopathologyResult)
  if (phytopathologyResults.length === 0) return null

  const formats = new Set(
    phytopathologyResults.map((result) => readPhytopathologyTableFormat(result.findings))
  )
  if (formats.size > 1) return 'mixed'
  return phytopathologyResults[0]
    ? readPhytopathologyTableFormat(phytopathologyResults[0].findings)
    : null
}

export function readSintomatologia(findings: unknown): string {
  const record = parseFindingsRecord(findings)
  return typeof record?.sintomatologia === 'string' ? record.sintomatologia : ''
}

export function emptyIsolationMicroorganism(): IsolationMicroorganism {
  return { name: '', is_sag_zero_tolerance: false }
}

export function emptyIsolationTest(sampleNumber = ''): IsolationTestRow {
  return {
    sampleNumber,
    identification: '',
    tissue: '',
    microorganisms: [emptyIsolationMicroorganism()],
  }
}

function readIsolationMicroorganisms(value: unknown): IsolationMicroorganism[] {
  if (!Array.isArray(value) || value.length === 0) {
    return [emptyIsolationMicroorganism()]
  }

  return value.map((item) => {
    if (!item || typeof item !== 'object') return emptyIsolationMicroorganism()
    const record = item as Record<string, unknown>
    return {
      name: typeof record.name === 'string' ? record.name : '',
      is_sag_zero_tolerance: record.is_sag_zero_tolerance === true,
    }
  })
}

export function parseIsolationTests(findings: unknown): IsolationTestRow[] {
  const record = parseFindingsRecord(findings)
  const tests = record?.tests
  if (!Array.isArray(tests) || tests.length === 0) {
    return [emptyIsolationTest()]
  }

  return tests.map((test) => {
    if (!test || typeof test !== 'object') return emptyIsolationTest()
    const row = test as Record<string, unknown>
    return {
      sampleNumber: typeof row.sampleNumber === 'string' ? row.sampleNumber : '',
      identification: typeof row.identification === 'string' ? row.identification : '',
      tissue: typeof row.tissue === 'string' ? row.tissue : '',
      microorganisms: readIsolationMicroorganisms(row.microorganisms),
    }
  })
}

function cleanIsolationTests(tests: IsolationTestRow[]): IsolationTestRow[] {
  return tests
    .map((test) => ({
      ...test,
      sampleNumber: test.sampleNumber.trim(),
      identification: test.identification.trim(),
      tissue: test.tissue.trim(),
      microorganisms: test.microorganisms
        .map((microorganism) => ({
          name: microorganism.name.trim(),
          is_sag_zero_tolerance: microorganism.is_sag_zero_tolerance === true,
        }))
        .filter((microorganism) => microorganism.name !== ''),
    }))
    .filter(
      (test) =>
        test.sampleNumber !== '' ||
        test.identification !== '' ||
        test.tissue !== '' ||
        test.microorganisms.length > 0
    )
}

export function buildIsolationFindings(params: {
  tests: IsolationTestRow[]
  sintomatologia: string
}): {
  type: 'fitopatologia'
  tableFormat: typeof TISSUE_ISOLATION_TABLE_FORMAT
  sintomatologia: string
  tests: IsolationTestRow[]
} | null {
  const tests = cleanIsolationTests(params.tests)
  const sintomatologia = params.sintomatologia.trim()
  if (tests.length === 0 && sintomatologia === '') return null

  return {
    type: 'fitopatologia',
    tableFormat: TISSUE_ISOLATION_TABLE_FORMAT,
    sintomatologia,
    tests,
  }
}
