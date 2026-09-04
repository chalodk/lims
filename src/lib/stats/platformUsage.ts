import {
  ANALYSIS_TYPE_KEYS,
  ANALYSIS_TYPE_REGISTRY,
  getAnalysisTypeFromTestArea,
  type AnalysisType,
} from '@/config/analysisTypes'

export const PLATFORM_STATS_MONTHS = 6

export const UNCATEGORIZED_TYPE_KEY = '__uncategorized__'

export type MonthBucket = {
  monthKey: string
  label: string
  startIso: string
  endIso: string
}

export type StatusCount = {
  key: string
  label: string
  count: number
}

export type TypeCount = {
  key: string
  label: string
  count: number
}

export type CompanyPlatformStats = {
  companyId: string
  companyName: string
  period: {
    thisMonth: MonthBucket
    lastMonth: MonthBucket
  }
  clients: { total: number }
  samples: {
    total: number
    thisMonth: number
    lastMonth: number
    active: number
    byStatus: StatusCount[]
    byMonth: Array<MonthBucket & { count: number }>
    byType: TypeCount[]
  }
  reports: {
    total: number
    thisMonth: number
    lastMonth: number
    completedTotal: number
    completedThisMonth: number
    byStatus: StatusCount[]
    byMonth: Array<MonthBucket & { count: number }>
    byType: TypeCount[]
  }
}

export function calendarMonthBounds(year: number, monthIndex0: number): { startIso: string; endIso: string } {
  const start = new Date(year, monthIndex0, 1, 0, 0, 0, 0)
  const end = new Date(year, monthIndex0 + 1, 1, 0, 0, 0, 0)
  return {
    startIso: start.toISOString(),
    endIso: end.toISOString(),
  }
}

export function rollingCalendarMonths(
  count: number,
  referenceDate: Date = new Date()
): MonthBucket[] {
  const months: MonthBucket[] = []
  for (let offset = count - 1; offset >= 0; offset -= 1) {
    const cursor = new Date(referenceDate.getFullYear(), referenceDate.getMonth() - offset, 1)
    const year = cursor.getFullYear()
    const monthIndex0 = cursor.getMonth()
    const monthKey = `${year}-${String(monthIndex0 + 1).padStart(2, '0')}`
    months.push({
      monthKey,
      label: new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' }).format(cursor),
      ...calendarMonthBounds(year, monthIndex0),
    })
  }
  return months
}

export function monthOverMonthPercent(current: number, previous: number): number | null {
  if (previous === 0) {
    return current === 0 ? 0 : null
  }
  return Math.round(((current - previous) / previous) * 100)
}

export function labelAnalysisArea(raw: string | null | undefined): { key: string; label: string } {
  const trimmed = raw?.trim() || ''
  if (!trimmed || trimmed === 'default') {
    return { key: UNCATEGORIZED_TYPE_KEY, label: 'Sin categoría' }
  }

  if ((ANALYSIS_TYPE_KEYS as readonly string[]).includes(trimmed)) {
    const analysisType = trimmed as AnalysisType
    return { key: analysisType, label: ANALYSIS_TYPE_REGISTRY[analysisType].label }
  }

  const fromArea = getAnalysisTypeFromTestArea(trimmed)
  if (fromArea !== 'default') {
    return { key: fromArea, label: ANALYSIS_TYPE_REGISTRY[fromArea].label }
  }

  return { key: trimmed, label: trimmed }
}

export function mergeTypeCounts(
  rows: Array<{ type_key?: string; count?: number }> | undefined
): TypeCount[] {
  const merged = new Map<string, TypeCount>()
  for (const row of rows || []) {
    const { key, label } = labelAnalysisArea(row.type_key)
    const count = Number(row.count) || 0
    const previous = merged.get(key)
    if (previous) {
      previous.count += count
    } else {
      merged.set(key, { key, label, count })
    }
  }
  return Array.from(merged.values())
    .filter((row) => row.count > 0)
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label, 'es'))
}
