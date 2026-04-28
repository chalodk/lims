import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

const MONTHS_BACK = 3

/** Etiquetas para valores típicos de `test_area` (tipo de análisis). */
const ANALYSIS_AREA_LABELS: Record<string, string> = {
  nematologia: 'Nematología',
  fitopatologia: 'Fitopatología',
  virologia: 'Virología',
  deteccion_precoz: 'Detección precoz'
}

function formatTestAreaLabel(raw: string | null): { typeKey: string; label: string } {
  if (raw === null || String(raw).trim() === '') {
    return { typeKey: '__uncategorized__', label: 'Sin especificar' }
  }
  const trimmed = String(raw).trim()
  const normalized = trimmed.toLowerCase()
  const label =
    ANALYSIS_AREA_LABELS[normalized] ??
    normalized
      .split('_')
      .filter(Boolean)
      .map((segment) => segment.charAt(0).toUpperCase() + segment.slice(1))
      .join(' ')
  return { typeKey: normalized, label }
}

function rollingMonthKeysUtc(): string[] {
  const keys: string[] = []
  const now = new Date()
  for (let i = MONTHS_BACK; i >= 0; i--) {
    const reference = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - i, 1))
    keys.push(
      `${reference.getUTCFullYear()}-${String(reference.getUTCMonth() + 1).padStart(2, '0')}`
    )
  }
  return keys
}

function formatMonthLabel(monthKey: string): string {
  const [yearStr, monthStr] = monthKey.split('-')
  const year = Number(yearStr)
  const month = Number(monthStr)
  const date = new Date(year, month - 1, 1)
  return new Intl.DateTimeFormat('es', { month: 'short', year: 'numeric' }).format(date)
}

function monthKeyFromTimestamp(iso: string | null): string | null {
  if (!iso) return null
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`
}

function monthKeyFromReceivedDate(receivedDate: string | null): string | null {
  if (!receivedDate || typeof receivedDate !== 'string') return null
  const trimmed = receivedDate.trim()
  if (/^\d{4}-\d{2}-\d{2}/.test(trimmed)) {
    return trimmed.slice(0, 7)
  }
  const parsed = new Date(trimmed)
  if (Number.isNaN(parsed.getTime())) return null
  return `${parsed.getUTCFullYear()}-${String(parsed.getUTCMonth() + 1).padStart(2, '0')}`
}

async function fetchAllPages<T>(
  fetchRange: (
    fromInclusive: number,
    toInclusive: number
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000
  let fromInclusive = 0
  const accumulated: T[] = []
  while (true) {
    const toInclusive = fromInclusive + pageSize - 1
    const { data, error } = await fetchRange(fromInclusive, toInclusive)
    if (error) {
      throw error
    }
    const chunk = data ?? []
    accumulated.push(...chunk)
    if (chunk.length < pageSize) break
    fromInclusive += pageSize
  }
  return accumulated
}

export async function GET() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id ?? undefined

    const monthSequence = rollingMonthKeysUtc()
    const oldestKey = monthSequence[0]
    const [oldestYearStr, oldestMonthStr] = oldestKey.split('-')
    const rangeStartIso = new Date(
      Date.UTC(Number(oldestYearStr), Number(oldestMonthStr) - 1, 1, 0, 0, 0, 0)
    ).toISOString()

    const sampleRows = await fetchAllPages<{ created_at: string | null; received_date: string | null }>(
      async (fromInclusive, toInclusive) => {
        let query = supabase
          .from('samples')
          .select('created_at, received_date')
          .gte('created_at', rangeStartIso)
          .range(fromInclusive, toInclusive)

        if (companyId) {
          query = query.eq('company_id', companyId)
        }

        return query
      }
    )

    const countsByMonth = new Map<string, number>()
    for (const key of monthSequence) {
      countsByMonth.set(key, 0)
    }

    for (const row of sampleRows) {
      let key = monthKeyFromTimestamp(row.created_at)
      if (!key || !countsByMonth.has(key)) {
        key = monthKeyFromReceivedDate(row.received_date)
      }
      if (key && countsByMonth.has(key)) {
        countsByMonth.set(key, (countsByMonth.get(key) ?? 0) + 1)
      }
    }

    const samplesByMonth = monthSequence.map((monthKey) => ({
      monthKey,
      label: formatMonthLabel(monthKey),
      count: countsByMonth.get(monthKey) ?? 0
    }))

    const resultRows = await fetchAllPages<{ test_area: string | null }>(
      async (fromInclusive, toInclusive) => {
        if (companyId) {
          return supabase
            .from('results')
            .select('test_area, samples!inner(company_id)')
            .eq('samples.company_id', companyId)
            .range(fromInclusive, toInclusive)
        }
        return supabase.from('results').select('test_area').range(fromInclusive, toInclusive)
      }
    )

    const analysisTypeCounts = new Map<string, { label: string; count: number }>()
    for (const row of resultRows) {
      const { typeKey, label } = formatTestAreaLabel(row.test_area)
      const existing = analysisTypeCounts.get(typeKey)
      if (existing) {
        existing.count += 1
      } else {
        analysisTypeCounts.set(typeKey, { label, count: 1 })
      }
    }

    const resultsByType = Array.from(analysisTypeCounts.entries())
      .map(([typeKey, meta]) => ({
        typeKey,
        label: meta.label,
        count: meta.count
      }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      samplesByMonth,
      resultsByType
    })
  } catch (error) {
    console.error('Error fetching chart statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
