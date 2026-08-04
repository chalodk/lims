import type { SupabaseClient } from '@supabase/supabase-js'

export type FindingsSourceKind = 'nematode' | 'test'

export interface FindingsNormalizedRow {
  result_id: string
  sample_id: string
  test_area: string | null
  findings_type: string | null
  source_kind: FindingsSourceKind
  source_index: number
  pathogen_name: string
  quantity: string | null
  quantity_numeric: number | null
  detection_result: string | null
  is_sag_zero_tolerance: boolean
}

type FindingsJson = {
  type?: string
  nematodes?: Array<{
    name?: string
    quantity?: string | number
    is_sag_zero_tolerance?: boolean
  }>
  tests?: Array<{
    virus?: string
    microorganism?: string
    identification?: string
    result?: string
    quantity?: string | number
    is_sag_zero_tolerance?: boolean
    [key: string]: unknown
  }>
}

const FINDINGS_TYPE_TO_TEST_AREA: Record<string, string> = {
  nematologia_positive: 'nematologia',
  nematologia_negative: 'nematologia',
  virologia: 'virologia',
  bacteriologia: 'bacteriologia',
  fitopatologia: 'fitopatologia',
  deteccion_precoz: 'deteccion_precoz',
}

function parseQuantityNumeric(quantity: string | number | null | undefined): number | null {
  if (quantity === null || quantity === undefined || quantity === '') return null
  if (typeof quantity === 'number' && Number.isFinite(quantity)) return quantity
  const cleaned = String(quantity).trim().replace(/\s/g, '')
  // "1.920" (miles) vs "1,5" / "1.5" (decimal): si hay un solo separador y 3 dígitos finales, tratar como miles
  const thousandsMatch = cleaned.match(/^(\d{1,3}(?:\.\d{3})+)$/)
  if (thousandsMatch) {
    const parsedThousands = Number.parseFloat(cleaned.replace(/\./g, ''))
    return Number.isFinite(parsedThousands) ? parsedThousands : null
  }
  const normalized = cleaned.replace(',', '.')
  const parsed = Number.parseFloat(normalized.replace(/[^\d.-]/g, ''))
  return Number.isFinite(parsed) ? parsed : null
}

function asBooleanFlag(value: unknown): boolean {
  return value === true || value === 'true' || value === 1
}

/**
 * Derives tabular rows from results.findings JSON (one row per pathogen detection).
 */
export function extractFindingsNormalizedRows(params: {
  resultId: string
  sampleId: string
  findings: unknown
  testAreaFallback?: string | null
}): FindingsNormalizedRow[] {
  const { resultId, sampleId, findings, testAreaFallback } = params

  let parsed: FindingsJson | null = null
  if (typeof findings === 'string') {
    try {
      parsed = JSON.parse(findings) as FindingsJson
    } catch {
      return []
    }
  } else if (findings && typeof findings === 'object') {
    parsed = findings as FindingsJson
  }

  if (!parsed) return []

  const findingsType = parsed.type || null
  const testArea =
    (findingsType && FINDINGS_TYPE_TO_TEST_AREA[findingsType]) ||
    testAreaFallback ||
    null

  const rows: FindingsNormalizedRow[] = []

  if (Array.isArray(parsed.nematodes)) {
    parsed.nematodes.forEach((nematode, sourceIndex) => {
      const pathogenName = (nematode.name || '').trim()
      if (!pathogenName) return
      const quantity =
        nematode.quantity === null || nematode.quantity === undefined
          ? null
          : String(nematode.quantity)
      rows.push({
        result_id: resultId,
        sample_id: sampleId,
        test_area: testArea,
        findings_type: findingsType,
        source_kind: 'nematode',
        source_index: sourceIndex,
        pathogen_name: pathogenName,
        quantity,
        quantity_numeric: parseQuantityNumeric(nematode.quantity),
        detection_result: null,
        is_sag_zero_tolerance: asBooleanFlag(nematode.is_sag_zero_tolerance),
      })
    })
  }

  if (Array.isArray(parsed.tests)) {
    parsed.tests.forEach((test, sourceIndex) => {
      const pathogenName = (
        (typeof test.virus === 'string' && test.virus) ||
        (typeof test.microorganism === 'string' && test.microorganism) ||
        ''
      ).trim()
      if (!pathogenName) return

      const quantity =
        test.quantity === null || test.quantity === undefined
          ? null
          : String(test.quantity)

      rows.push({
        result_id: resultId,
        sample_id: sampleId,
        test_area: testArea,
        findings_type: findingsType,
        source_kind: 'test',
        source_index: sourceIndex,
        pathogen_name: pathogenName,
        quantity,
        quantity_numeric: parseQuantityNumeric(test.quantity),
        detection_result: typeof test.result === 'string' ? test.result : null,
        is_sag_zero_tolerance: asBooleanFlag(test.is_sag_zero_tolerance),
      })
    })
  }

  return rows
}

/**
 * Replaces all normalized rows for a result from current findings JSON.
 */
export async function syncFindingsNormalized(
  supabase: SupabaseClient,
  params: {
    resultId: string
    sampleId: string
    findings: unknown
    testAreaFallback?: string | null
  }
): Promise<{ error: Error | null }> {
  const rows = extractFindingsNormalizedRows(params)

  const { error: deleteError } = await supabase
    .from('findings_normalized')
    .delete()
    .eq('result_id', params.resultId)

  if (deleteError) {
    return { error: new Error(deleteError.message) }
  }

  if (rows.length === 0) {
    return { error: null }
  }

  const { error: insertError } = await supabase
    .from('findings_normalized')
    .insert(rows)

  if (insertError) {
    return { error: new Error(insertError.message) }
  }

  return { error: null }
}
