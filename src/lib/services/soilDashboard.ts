import type { SupabaseClient } from '@supabase/supabase-js'

export type SoilSampleStatusCounts = {
  received: number
  in_analysis: number
  completed: number
}

export type SoilDashboardImport = {
  id: string
  fileName: string
  createdAt: string
  resultCount: number
  sampleCount: number
  warningCount: number
}

export type SoilDashboardMatrixReports = {
  matrixKey: string
  matrixName: string
  reportCount: number
}

export type SoilDashboard = {
  samplesByStatus: SoilSampleStatusCounts
  recentImports: SoilDashboardImport[]
  reportsByMatrix: SoilDashboardMatrixReports[]
}

type MatrixJoin = { key: string; name: string } | { key: string; name: string }[] | null

export type SoilReportCountRow = {
  soil_matrices: MatrixJoin
}

const EMPTY_COUNTS: SoilSampleStatusCounts = {
  received: 0,
  in_analysis: 0,
  completed: 0,
}

function finiteNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0
}

function matrixFromJoin(join: MatrixJoin): { key: string; name: string } | null {
  if (!join) return null
  return Array.isArray(join) ? join[0] ?? null : join
}

export function countSoilSamplesByStatus(statuses: string[]): SoilSampleStatusCounts {
  const counts: SoilSampleStatusCounts = { ...EMPTY_COUNTS }
  for (const status of statuses) {
    if (status === 'received' || status === 'in_analysis' || status === 'completed') {
      counts[status] += 1
    }
  }
  return counts
}

export function readSoilImportSummary(summary: unknown): {
  resultCount: number
  sampleCount: number
  warningCount: number
} {
  if (!summary || typeof summary !== 'object') {
    return { resultCount: 0, sampleCount: 0, warningCount: 0 }
  }
  const record = summary as Record<string, unknown>
  return {
    resultCount: finiteNumber(record.resultCount),
    sampleCount: finiteNumber(record.sampleCount),
    warningCount: finiteNumber(record.warningCount),
  }
}

export function countReportsByMatrix(rows: SoilReportCountRow[]): SoilDashboardMatrixReports[] {
  const counts = new Map<string, SoilDashboardMatrixReports>()
  for (const row of rows) {
    const matrix = matrixFromJoin(row.soil_matrices)
    if (!matrix?.key) continue
    const current = counts.get(matrix.key)
    if (current) {
      current.reportCount += 1
    } else {
      counts.set(matrix.key, {
        matrixKey: matrix.key,
        matrixName: matrix.name,
        reportCount: 1,
      })
    }
  }
  return [...counts.values()].sort((left, right) => left.matrixName.localeCompare(right.matrixName, 'es'))
}

type ImportRow = {
  id: string
  file_name: string
  created_at: string
  summary: unknown
}

export function assembleSoilDashboard(input: {
  sampleStatuses: string[]
  imports: ImportRow[]
  reports: SoilReportCountRow[]
}): SoilDashboard {
  return {
    samplesByStatus: countSoilSamplesByStatus(input.sampleStatuses),
    recentImports: input.imports.map((row) => ({
      id: row.id,
      fileName: row.file_name,
      createdAt: row.created_at,
      ...readSoilImportSummary(row.summary),
    })),
    reportsByMatrix: countReportsByMatrix(input.reports),
  }
}

export async function getSoilDashboard(
  supabase: SupabaseClient,
  companyId: string
): Promise<SoilDashboard> {
  const [samplesResult, importsResult, reportsResult] = await Promise.all([
    supabase.from('soil_samples').select('status').eq('company_id', companyId),
    supabase
      .from('soil_result_imports')
      .select('id, file_name, created_at, summary')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false })
      .limit(5),
    supabase.from('soil_reports').select('matrix_id, soil_matrices(key, name)').eq('company_id', companyId),
  ])

  if (samplesResult.error) {
    throw new Error(`Error contando muestras de suelo: ${samplesResult.error.message}`)
  }
  if (importsResult.error) {
    throw new Error(`Error leyendo importaciones de suelo: ${importsResult.error.message}`)
  }
  if (reportsResult.error) {
    throw new Error(`Error contando informes de suelo: ${reportsResult.error.message}`)
  }

  const sampleRows = (samplesResult.data ?? []) as { status: string }[]
  const importRows = (importsResult.data ?? []) as ImportRow[]
  const reportRows = (reportsResult.data ?? []) as SoilReportCountRow[]

  return assembleSoilDashboard({
    sampleStatuses: sampleRows.map((row) => row.status),
    imports: importRows,
    reports: reportRows,
  })
}
