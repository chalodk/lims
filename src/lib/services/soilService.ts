import type { SupabaseServerClient } from '@/lib/auth/api-auth'
import { resolveSoilLabAccess, type SoilAccessResult } from '@/lib/soil/soilAccess'
import type {
  PlannedSoilResult,
  RegisteredSoilSample,
  SoilCatalogAnalysis,
} from '@/lib/soil/importPreview'
import type { ReportPayloadAnalysis, ReportPayloadSampleInput } from '@/lib/soil/reportPayload'
import { soilAnalysisReportSet } from '@/lib/soil/sheetLayouts'
import type { SoilSampledBy } from '@/lib/soil/sampleIntake'

type RoleJoin = { name: string } | { name: string }[] | null

export async function requireSoilLab(
  supabase: SupabaseServerClient,
  userId: string
): Promise<SoilAccessResult> {
  return resolveSoilLabAccess({
    loadUserProfile: async () => {
      const { data, error } = await supabase
        .from('users')
        .select('company_id, roles(name)')
        .eq('id', userId)
        .single()
      if (error || !data) return null
      const roleData = data.roles as RoleJoin
      const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name
      return { companyId: data.company_id ?? null, roleName: roleName ?? null }
    },
    companyHasSoilVertical: async () => {
      const { data, error } = await supabase.rpc('user_has_active_vertical', {
        p_vertical_key: 'suelo',
      })
      if (error) throw new Error(error.message)
      return data === true
    },
  })
}

type SoilAnalysisRow = {
  id: string
  report_title: string
  unit: string | null
  result_kind: 'numeric' | 'text'
  method_label: string | null
  excel_sheet: string | null
  excel_value_column: string | null
  excel_discriminator_column: string | null
  excel_discriminator_value: string | null
  excel_unit_column: string | null
  excel_subsample_column: string | null
  active: boolean
  pending_note: string | null
  sort_order: number
  soil_analysis_matrices: { matrix_id: string }[] | null
}

const SOIL_ANALYSIS_COLUMNS =
  'id, report_title, unit, result_kind, method_label, excel_sheet, excel_value_column, excel_discriminator_column, excel_discriminator_value, excel_unit_column, excel_subsample_column, active, pending_note, sort_order, soil_analysis_matrices(matrix_id)'

export interface SoilAnalysisSummary {
  id: string
  reportTitle: string
  unit: string | null
  methodLabel: string | null
  active: boolean
  pendingNote: string | null
  matrixIds: string[]
}

export async function listSoilAnalyses(
  supabase: SupabaseServerClient,
  companyId: string
): Promise<SoilAnalysisSummary[]> {
  const { data, error } = await supabase
    .from('soil_analyses')
    .select(SOIL_ANALYSIS_COLUMNS)
    .eq('company_id', companyId)
    .order('sort_order')
  if (error) throw new Error(error.message)
  return ((data || []) as unknown as SoilAnalysisRow[]).map((row) => ({
    id: row.id,
    reportTitle: row.report_title,
    unit: row.unit,
    methodLabel: row.method_label,
    active: row.active,
    pendingNote: row.pending_note,
    matrixIds: (row.soil_analysis_matrices || []).map((link) => link.matrix_id),
  }))
}

export async function loadImportCatalog(
  supabase: SupabaseServerClient,
  companyId: string
): Promise<SoilCatalogAnalysis[]> {
  const { data, error } = await supabase
    .from('soil_analyses')
    .select(SOIL_ANALYSIS_COLUMNS)
    .eq('company_id', companyId)
    .eq('active', true)
  if (error) throw new Error(error.message)
  return ((data || []) as unknown as SoilAnalysisRow[])
    .filter((row) => row.excel_sheet && row.excel_value_column)
    .map((row) => ({
      id: row.id,
      reportTitle: row.method_label ? `${row.report_title} (${row.method_label})` : row.report_title,
      unit: row.unit,
      resultKind: row.result_kind,
      excelSheet: row.excel_sheet!,
      excelValueColumn: row.excel_value_column!,
      excelDiscriminatorColumn: row.excel_discriminator_column,
      excelDiscriminatorValue: row.excel_discriminator_value,
      excelUnitColumn: row.excel_unit_column,
      excelSubsampleColumn: row.excel_subsample_column,
      methodLabel: row.method_label,
      matrixIds: (row.soil_analysis_matrices || []).map((link) => link.matrix_id),
    }))
}

type RegisteredSampleRow = {
  id: string
  code: string
  soil_subsamples: { id: string; number: number }[] | null
}

/** Muestras ya registradas, para anexar resultados y no cambiarles el cliente. */
export async function loadRegisteredSamplesForImport(
  supabase: SupabaseServerClient,
  companyId: string
): Promise<RegisteredSoilSample[]> {
  const { data, error } = await supabase
    .from('soil_samples')
    .select('id, code, soil_subsamples(id, number)')
    .eq('company_id', companyId)
  if (error) throw new Error(error.message)
  return ((data || []) as unknown as RegisteredSampleRow[]).map((row) => ({
    id: row.id,
    code: row.code,
    subsamples: row.soil_subsamples || [],
  }))
}

export async function loadSoilMatrices(
  supabase: SupabaseServerClient
): Promise<{ id: string; key: string; name: string }[]> {
  const { data, error } = await supabase.from('soil_matrices').select('id, key, name').order('name')
  if (error) throw new Error(error.message)
  return data || []
}

/**
 * Crea las muestras que la planilla trae y que todavía no existen.
 * El cliente, la recepción y la toma de muestra se aplican solo a estas.
 */
export async function createImportedSoilSamples(
  supabase: SupabaseServerClient,
  input: {
    companyId: string
    clientId: string
    receivedAt: string
    sampledAt: string
    sampledBy: SoilSampledBy
    createdBy: string
    codes: string[]
  }
): Promise<Map<string, string>> {
  if (input.codes.length === 0) return new Map()
  const { data, error } = await supabase
    .from('soil_samples')
    .insert(
      input.codes.map((code) => ({
        company_id: input.companyId,
        client_id: input.clientId,
        code,
        received_at: input.receivedAt,
        sampled_at: input.sampledAt,
        sampled_by: input.sampledBy,
        created_by: input.createdBy,
      }))
    )
    .select('id, code')
  if (error) throw new Error(error.code === '23505' ? 'DUPLICATE_SAMPLE' : error.message)
  return new Map((data || []).map((row) => [row.code as string, row.id as string]))
}

/**
 * Crea las submuestras que faltan, guarda los resultados (una fila por submuestra y análisis)
 * y recalcula el estado de cada muestra tocada.
 */
export async function commitSoilResults(
  supabase: SupabaseServerClient,
  plannedResults: PlannedSoilResult[],
  importId: string
): Promise<{ savedResultCount: number; touchedSampleCount: number }> {
  const missingSubsamples = new Map<string, { sample_id: string; number: number }>()
  for (const result of plannedResults) {
    if (!result.sampleId) throw new Error(`La muestra ${result.sampleCode} no está registrada`)
    if (!result.subsampleId) {
      missingSubsamples.set(`${result.sampleId}|${result.subsampleNumber}`, {
        sample_id: result.sampleId,
        number: result.subsampleNumber,
      })
    }
  }

  const subsampleIdByKey = new Map<string, string>()
  if (missingSubsamples.size > 0) {
    const { data: createdSubsamples, error: subsampleError } = await supabase
      .from('soil_subsamples')
      .upsert([...missingSubsamples.values()], { onConflict: 'sample_id,number' })
      .select('id, sample_id, number')
    if (subsampleError) throw new Error(subsampleError.message)
    for (const subsample of createdSubsamples || []) {
      subsampleIdByKey.set(`${subsample.sample_id}|${subsample.number}`, subsample.id)
    }
  }

  const resultRows = plannedResults.map((result) => ({
    subsample_id:
      result.subsampleId ?? subsampleIdByKey.get(`${result.sampleId}|${result.subsampleNumber}`)!,
    analysis_id: result.analysisId,
    value_numeric: result.valueNumeric,
    value_qualifier: result.valueQualifier,
    value_text: result.valueText,
    raw_value: result.rawValue,
    unit: result.unit,
    basis: result.basis,
    import_id: importId,
    updated_at: new Date().toISOString(),
  }))

  if (resultRows.length > 0) {
    const { error: resultError } = await supabase
      .from('soil_results')
      .upsert(resultRows, { onConflict: 'subsample_id,analysis_id' })
    if (resultError) throw new Error(resultError.message)
  }

  const touchedSampleIds = [...new Set(plannedResults.map((result) => result.sampleId).filter((sampleId): sampleId is string => !!sampleId))]
  for (const sampleId of touchedSampleIds) {
    await refreshSoilSampleStatus(supabase, sampleId)
  }

  return { savedResultCount: resultRows.length, touchedSampleCount: touchedSampleIds.length }
}

type SampleProgressRow = {
  soil_subsamples: { soil_results: { id: string }[] | null }[] | null
}

/** En análisis en cuanto la muestra tiene algún resultado. */
export async function refreshSoilSampleStatus(
  supabase: SupabaseServerClient,
  sampleId: string
): Promise<void> {
  const { data, error } = await supabase
    .from('soil_samples')
    .select('soil_subsamples(soil_results(id))')
    .eq('id', sampleId)
    .single()
  if (error || !data) throw new Error(error?.message || 'Muestra no encontrada')

  const progress = data as unknown as SampleProgressRow
  const resultCount = (progress.soil_subsamples || []).reduce(
    (total, subsample) => total + (subsample.soil_results || []).length,
    0
  )
  const status = resultCount > 0 ? 'in_analysis' : 'received'
  const { error: updateError } = await supabase.from('soil_samples').update({ status }).eq('id', sampleId)
  if (updateError) throw new Error(updateError.message)
}

type ReportResultRow = {
  analysis_id: string
  value_numeric: number | null
  value_qualifier: string | null
  value_text: string | null
  unit: string | null
}

type ReportSourceRow = {
  id: string
  code: string
  status: string
  received_at: string
  clients: { name: string } | { name: string }[] | null
  soil_subsamples: { number: number; soil_results: ReportResultRow[] | null }[] | null
}

type ReportAnalysisRow = {
  id: string
  report_title: string
  unit: string | null
  method_label: string | null
  excel_sheet: string | null
  excel_discriminator_value: string | null
  sort_order: number
  soil_analysis_matrices: { matrix_id: string }[] | null
}

function firstJoined<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/**
 * Muestras con sus resultados, y el catálogo aparte.
 * El catálogo no va anidado en cada resultado: con miles de filas esa consulta
 * supera el tiempo de Postgres y la pantalla de informe responde 500.
 */
export async function loadSoilReportSources(
  supabase: SupabaseServerClient,
  companyId: string
): Promise<{ samples: (ReportPayloadSampleInput & { status: string })[]; analyses: ReportPayloadAnalysis[] }> {
  const [samplesResponse, analysesResponse] = await Promise.all([
    supabase
      .from('soil_samples')
      .select(
        'id, code, status, received_at, clients(name), soil_subsamples(number, soil_results(analysis_id, value_numeric, value_qualifier, value_text, unit))'
      )
      .eq('company_id', companyId)
      .order('received_at', { ascending: false })
      .limit(500),
    supabase
      .from('soil_analyses')
      .select('id, report_title, unit, method_label, excel_sheet, excel_discriminator_value, sort_order, soil_analysis_matrices(matrix_id)')
      .eq('company_id', companyId),
  ])
  if (samplesResponse.error) throw new Error(samplesResponse.error.message)
  if (analysesResponse.error) throw new Error(analysesResponse.error.message)

  const analyses = new Map<string, ReportPayloadAnalysis>()
  for (const row of (analysesResponse.data || []) as unknown as ReportAnalysisRow[]) {
    analyses.set(row.id, {
      id: row.id,
      reportTitle: row.method_label ? `${row.report_title} (${row.method_label})` : row.report_title,
      unit: row.unit,
      sortOrder: row.sort_order,
      matrixIds: (row.soil_analysis_matrices || []).map((link) => link.matrix_id),
      reportSet: soilAnalysisReportSet(row.excel_sheet, row.excel_discriminator_value),
    })
  }

  const samples = ((samplesResponse.data || []) as unknown as ReportSourceRow[]).map((row) => {
    const subsamples = (row.soil_subsamples || [])
      .slice()
      .sort((left, right) => left.number - right.number)
      .map((subsample) => ({
        number: subsample.number,
        results: (subsample.soil_results || []).flatMap((result) => {
          if (!analyses.has(result.analysis_id)) return []
          return [
            {
              analysisId: result.analysis_id,
              valueNumeric: result.value_numeric,
              valueQualifier: result.value_qualifier,
              valueText: result.value_text,
              unit: result.unit,
            },
          ]
        }),
      }))
    return {
      id: row.id,
      code: row.code,
      status: row.status,
      clientName: firstJoined(row.clients)?.name ?? null,
      receivedAt: row.received_at,
      subsamples,
    }
  })

  return { samples, analyses: [...analyses.values()] }
}
