import { getAnalysisTypeFromTestArea, type AnalysisType } from '@/config/analysisTypes'

export const SANTIAGO_TIME_ZONE = 'America/Santiago'

export const DISCIPLINE_CATALOG = [
  { area: 'nematologia', analysisType: 'nematology', label: 'Nematología', color: '#16a34a' },
  { area: 'virologia', analysisType: 'virology', label: 'Virología', color: '#2563eb' },
  { area: 'fitopatologia', analysisType: 'phytopatology', label: 'Fitopatología', color: '#ca8a04' },
  { area: 'bacteriologia', analysisType: 'bacteriology', label: 'Bacteriología', color: '#9333ea' },
  { area: 'deteccion_precoz', analysisType: 'early_detection', label: 'Detección Precoz', color: '#92400e' },
] as const

export type DisciplineArea = (typeof DISCIPLINE_CATALOG)[number]['area']
export type DisciplineMonths = 6 | 12

export type DisciplineDefinition = (typeof DISCIPLINE_CATALOG)[number]

export type PrevalencePoint = {
  pathogenName: string
  count: number
  pct: number
}

export type MonthlySamplesPoint = {
  monthKey: string
  label: string
  totalSamples: number
  positiveSamples: number
  positivityPct: number
}

export type DisciplineDashboard = {
  area: { typeKey: DisciplineArea; label: string }
  prevalence: PrevalencePoint[]
  monthly: MonthlySamplesPoint[]
}

export type DonutDisciplineRow = {
  typeKey: string
  label: string
  count: number
  color: string
  selectable: boolean
}

export type DisciplineSampleInput = {
  id: string
  receivedAt: string | null
  receivedDate: string | null
}

export type DisciplineResultInput = {
  id: string
  sampleId: string
  testArea: string | null
}

export type DisciplineFindingInput = {
  resultId: string
  sampleId: string
  testArea: string | null
  findingsType: string | null
  pathogenName: string
  detectionResult: string | null
}

type MonthWindow = {
  monthKey: string
  label: string
}

export function resolveDiscipline(raw: string | null | undefined): DisciplineDefinition | null {
  const input = raw?.trim().toLowerCase()
  if (!input) return null
  return (
    DISCIPLINE_CATALOG.find((discipline) => discipline.area === input || discipline.analysisType === input) ??
    null
  )
}

export function parseDisciplineQuery(search: {
  area: string | null
  months: string | null
}):
  | { ok: true; discipline: DisciplineDefinition; months: DisciplineMonths }
  | { ok: false; status: 400; error: string } {
  const discipline = resolveDiscipline(search.area)
  if (!search.area?.trim()) {
    return { ok: false, status: 400, error: 'El área de análisis es obligatoria' }
  }
  if (!discipline) {
    return { ok: false, status: 400, error: 'Área de análisis desconocida' }
  }

  if (search.months === null || search.months.trim() === '') {
    return { ok: true, discipline, months: 6 }
  }

  if (search.months !== '6' && search.months !== '12') {
    return { ok: false, status: 400, error: 'La ventana debe ser 6 o 12 meses' }
  }

  return { ok: true, discipline, months: Number(search.months) as DisciplineMonths }
}

export function santiagoYearMonth(reference: Date): { year: number; month: number } {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: SANTIAGO_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
  }).formatToParts(reference)
  const year = Number(parts.find((part) => part.type === 'year')?.value)
  const month = Number(parts.find((part) => part.type === 'month')?.value)
  return { year, month }
}

export function formatDisciplineMonthLabel(year: number, month: number): string {
  const formatted = new Intl.DateTimeFormat('es', {
    month: 'short',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(Date.UTC(year, month - 1, 15)))
  return formatted.replace(/\./g, '').replace(/\s+/g, ' ').trim().toLowerCase()
}

export function rollingSantiagoMonths(count: number, referenceDate: Date = new Date()): MonthWindow[] {
  const { year, month } = santiagoYearMonth(referenceDate)
  const months: MonthWindow[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(Date.UTC(year, month - 1 - offset, 1))
    const cursorYear = cursor.getUTCFullYear()
    const cursorMonth = cursor.getUTCMonth() + 1
    months.push({
      monthKey: `${cursorYear}-${String(cursorMonth).padStart(2, '0')}`,
      label: formatDisciplineMonthLabel(cursorYear, cursorMonth),
    })
  }
  return months
}

export function monthKeyFromSample(sample: {
  receivedAt: string | null
  receivedDate: string | null
}): string | null {
  if (sample.receivedAt) {
    return monthKeyInSantiago(sample.receivedAt)
  }
  const receivedDate = sample.receivedDate?.trim() ?? ''
  if (/^\d{4}-\d{2}/.test(receivedDate)) {
    return receivedDate.slice(0, 7)
  }
  if (receivedDate) return monthKeyInSantiago(receivedDate)
  return null
}

export function monthKeyInSantiago(iso: string): string | null {
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  const { year, month } = santiagoYearMonth(parsed)
  if (!year || !month) return null
  return `${year}-${String(month).padStart(2, '0')}`
}

export function foldPathogenName(pathogenName: string): string {
  return pathogenName.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().trim()
}

export const NON_PHYTOPARASITE_LABEL = 'No fitoparásitos'

/** Las dos formas de registrar nematodos no fitoparásitos se muestran como una sola barra. */
export function prevalencePathogenName(pathogenName: string): string {
  const trimmed = pathogenName.trim()
  if (foldPathogenName(trimmed).includes('no fitoparasit')) return NON_PHYTOPARASITE_LABEL
  return trimmed
}

/** Solo la ausencia queda fuera de la barra de positivos. La presencia de no fitoparásitos sí cuenta. */
export function isExcludedFromPositivity(pathogenName: string): boolean {
  return foldPathogenName(pathogenName).includes('sin presencia')
}

export function countsAsPositiveDetection(
  finding: Pick<DisciplineFindingInput, 'findingsType' | 'pathogenName' | 'detectionResult'>,
  discipline: DisciplineDefinition
): boolean {
  if (discipline.area === 'nematologia') {
    if (!finding.pathogenName.trim() || isExcludedFromPositivity(finding.pathogenName)) return false
    return finding.findingsType === 'nematologia_positive' || finding.findingsType === 'nematologia_negative'
  }
  return finding.detectionResult?.trim().toLowerCase() === 'positive'
}

export function positivityPercent(positiveSamples: number, totalSamples: number): number {
  if (totalSamples <= 0) return 0
  return Number(((positiveSamples / totalSamples) * 100).toFixed(1))
}

function disciplineFromTypeKey(typeKey: string): DisciplineDefinition | null {
  const direct = resolveDiscipline(typeKey)
  if (direct) return direct
  const analysisType: AnalysisType = getAnalysisTypeFromTestArea(typeKey)
  if (analysisType === 'default') return null
  return DISCIPLINE_CATALOG.find((discipline) => discipline.analysisType === analysisType) ?? null
}

export function matchesDiscipline(testArea: string | null | undefined, discipline: DisciplineDefinition): boolean {
  if (!testArea?.trim()) return false
  return getAnalysisTypeFromTestArea(testArea) === discipline.analysisType
}

export function buildDisciplineDonutRows(
  rows: Array<{ typeKey: string; label: string; count: number }>
): DonutDisciplineRow[] {
  const counts = new Map<DisciplineArea, number>()
  const extras = new Map<string, { label: string; count: number }>()

  for (const row of rows) {
    const discipline = disciplineFromTypeKey(row.typeKey)
    if (discipline) {
      counts.set(discipline.area, (counts.get(discipline.area) ?? 0) + row.count)
      continue
    }
    const extraKey = row.typeKey.trim() || '__uncategorized__'
    const existing = extras.get(extraKey)
    if (existing) {
      existing.count += row.count
    } else {
      extras.set(extraKey, { label: row.label, count: row.count })
    }
  }

  const catalogRows: DonutDisciplineRow[] = DISCIPLINE_CATALOG.map((discipline) => ({
    typeKey: discipline.area,
    label: discipline.label,
    count: counts.get(discipline.area) ?? 0,
    color: discipline.color,
    selectable: true,
  }))

  const extraRows: DonutDisciplineRow[] = Array.from(extras.entries())
    .filter(([, meta]) => meta.count > 0)
    .map(([typeKey, meta]) => ({
      typeKey,
      label: meta.label,
      count: meta.count,
      color: '#d1d5db',
      selectable: false,
    }))

  return [...catalogRows, ...extraRows]
}

export function buildDisciplineDashboard(params: {
  discipline: DisciplineDefinition
  months: DisciplineMonths
  referenceDate?: Date
  samples: DisciplineSampleInput[]
  results: DisciplineResultInput[]
  findings: DisciplineFindingInput[]
}): DisciplineDashboard {
  const referenceDate = params.referenceDate ?? new Date()
  const monthWindows = rollingSantiagoMonths(params.months, referenceDate)
  const openMonths = new Set(monthWindows.map((month) => month.monthKey))
  const samplesById = new Map(params.samples.map((sample) => [sample.id, sample]))

  const resultsInDiscipline = params.results.filter((result) =>
    matchesDiscipline(result.testArea, params.discipline)
  )
  const resultsById = new Map(resultsInDiscipline.map((result) => [result.id, result]))

  const sampleMonth = new Map<string, string>()
  for (const result of resultsInDiscipline) {
    const sample = samplesById.get(result.sampleId)
    if (!sample) continue
    const monthKey = monthKeyFromSample(sample)
    if (!monthKey || !openMonths.has(monthKey)) continue
    sampleMonth.set(sample.id, monthKey)
  }

  const totalsByMonth = new Map<string, Set<string>>()
  const positivesByMonth = new Map<string, Set<string>>()
  for (const month of monthWindows) {
    totalsByMonth.set(month.monthKey, new Set())
    positivesByMonth.set(month.monthKey, new Set())
  }
  for (const [sampleId, monthKey] of sampleMonth) {
    totalsByMonth.get(monthKey)?.add(sampleId)
  }

  const pathogenCounts = new Map<string, number>()
  for (const finding of params.findings) {
    const parentResult = resultsById.get(finding.resultId)
    const areaSource = finding.testArea || parentResult?.testArea || null
    if (!matchesDiscipline(areaSource, params.discipline)) continue
    const monthKey = sampleMonth.get(finding.sampleId)
    if (!monthKey) continue

    const pathogenName = prevalencePathogenName(finding.pathogenName)
    if (pathogenName) {
      pathogenCounts.set(pathogenName, (pathogenCounts.get(pathogenName) ?? 0) + 1)
    }

    if (countsAsPositiveDetection(finding, params.discipline)) {
      positivesByMonth.get(monthKey)?.add(finding.sampleId)
    }
  }

  const detectionTotal = Array.from(pathogenCounts.values()).reduce((sum, count) => sum + count, 0)
  const prevalence = Array.from(pathogenCounts.entries())
    .map(([pathogenName, count]) => ({
      pathogenName,
      count,
      pct: detectionTotal > 0 ? Number(((count / detectionTotal) * 100).toFixed(1)) : 0,
    }))
    .sort((left, right) => right.count - left.count || left.pathogenName.localeCompare(right.pathogenName, 'es'))

  const monthly = monthWindows.map((month) => {
    const totalSamples = totalsByMonth.get(month.monthKey)?.size ?? 0
    const positiveSamples = positivesByMonth.get(month.monthKey)?.size ?? 0
    return {
      monthKey: month.monthKey,
      label: month.label,
      totalSamples,
      positiveSamples,
      positivityPct: positivityPercent(positiveSamples, totalSamples),
    }
  })

  return {
    area: { typeKey: params.discipline.area, label: params.discipline.label },
    prevalence,
    monthly,
  }
}
