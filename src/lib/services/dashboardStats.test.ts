import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PROCESSING_SAMPLE_STATUSES,
  assembleDashboardStats,
  getDashboardStats,
} from './dashboardStats'

type FilterCall = { method: string; args: unknown[] }

type QueryCall = {
  table: string
  select: string
  options?: { count?: string; head?: boolean }
  filters: FilterCall[]
}

function countKey(call: QueryCall): string {
  const statusEquals = call.filters.find((filter) => filter.method === 'eq' && filter.args[0] === 'status')
  const statusIn = call.filters.find((filter) => filter.method === 'in' && filter.args[0] === 'status')
  const hasDayRange = call.filters.some((filter) => filter.method === 'gte')

  if (call.table === 'samples') {
    if (statusIn) return 'samples:processing'
    if (statusEquals) return `samples:${String(statusEquals.args[1])}`
    return 'samples:total'
  }
  if (call.table === 'results') {
    const status = statusEquals ? String(statusEquals.args[1]) : 'total'
    return hasDayRange ? `results:${status}:today` : `results:${status}`
  }
  if (call.table === 'reports') {
    if (statusEquals) return `reports:${String(statusEquals.args[1])}`
    return 'reports:total'
  }
  return 'clients:total'
}

function createMockSupabase(
  counts: Record<string, number>,
  options: { failLabel?: string } = {}
) {
  const calls: QueryCall[] = []

  const from = (table: string) => {
    const call: QueryCall = { table, select: '', filters: [] }
    calls.push(call)

    const builder = {
      select(columns: string, selectOptions?: { count?: string; head?: boolean }) {
        call.select = columns
        call.options = selectOptions
        return builder
      },
      eq(column: string, value: unknown) {
        call.filters.push({ method: 'eq', args: [column, value] })
        return builder
      },
      in(column: string, values: unknown[]) {
        call.filters.push({ method: 'in', args: [column, values] })
        return builder
      },
      gte(column: string, value: unknown) {
        call.filters.push({ method: 'gte', args: [column, value] })
        return builder
      },
      lte(column: string, value: unknown) {
        call.filters.push({ method: 'lte', args: [column, value] })
        return builder
      },
      then(onFulfilled: (value: { count: number | null; error: { message: string } | null; data: null }) => unknown, onRejected?: (reason: unknown) => unknown) {
        const key = countKey(call)
        const result =
          options.failLabel && key === options.failLabel
            ? { count: null, error: { message: 'boom' }, data: null }
            : { count: counts[key] ?? 0, error: null, data: null }
        return Promise.resolve(result).then(onFulfilled, onRejected)
      },
    }

    return builder
  }

  return { from, calls } as unknown as SupabaseClient & { calls: QueryCall[] }
}

describe('assembleDashboardStats', () => {
  it('derives active samples without the PostgREST 1000-row cap', () => {
    const stats = assembleDashboardStats({
      samples: { total: 1245, received: 1245, processing: 0, validation: 0, completed: 0 },
      results: { total: 1840, pending: 3, completed: 0, validated: 1837 },
      reports: { total: 247, draft: 247, generated: 0, sent: 0 },
      totalClients: 173,
      completedToday: 2,
    })

    assert.equal(stats.overview.activeSamples, 1245)
    assert.equal(stats.overview.pendingWork, 3)
    assert.equal(stats.overview.completedWork, 1837)
    assert.equal(stats.overview.totalReports, 247)
    assert.equal(stats.overview.totalClients, 173)
    assert.equal(stats.overview.completedToday, 2)
  })
})

describe('getDashboardStats', () => {
  const completedRangeStart = new Date('2026-09-09T00:00:00.000Z')
  const completedRangeEnd = new Date('2026-09-09T23:59:59.999Z')

  it('counts with exact SQL head queries and keeps company scope', async () => {
    const supabase = createMockSupabase({
      'samples:total': 1245,
      'samples:received': 1245,
      'samples:processing': 0,
      'samples:validation': 0,
      'samples:completed': 0,
      'results:total': 1840,
      'results:pending': 3,
      'results:completed': 0,
      'results:validated': 1837,
      'reports:total': 247,
      'reports:draft': 247,
      'reports:generated': 0,
      'reports:sent': 0,
      'clients:total': 173,
      'results:validated:today': 2,
      'results:completed:today': 0,
    })

    const stats = await getDashboardStats(supabase, {
      companyId: 'lab-nemachile',
      completedRangeStart,
      completedRangeEnd,
    })

    assert.equal(stats.samples.total, 1245)
    assert.equal(stats.overview.activeSamples, 1245)
    assert.equal(stats.results.validated, 1837)
    assert.equal(stats.overview.completedToday, 2)

    const typed = supabase as unknown as { calls: QueryCall[] }
    assert.ok(typed.calls.length > 0)
    assert.ok(
      typed.calls.every(
        (call) => call.options?.count === 'exact' && call.options?.head === true && !call.select.includes('status')
      )
    )
    assert.ok(
      typed.calls
        .filter((call) => call.table === 'samples')
        .every((call) => call.filters.some((filter) => filter.method === 'eq' && filter.args[0] === 'company_id' && filter.args[1] === 'lab-nemachile'))
    )

    const processingCall = typed.calls.find(
      (call) => call.table === 'samples' && call.filters.some((filter) => filter.method === 'in')
    )
    assert.deepEqual(
      processingCall?.filters.find((filter) => filter.method === 'in')?.args[1],
      [...PROCESSING_SAMPLE_STATUSES]
    )

    const resultCalls = typed.calls.filter((call) => call.table === 'results')
    assert.ok(resultCalls.every((call) => call.select.includes('samples!inner(company_id)')))
    assert.ok(
      resultCalls.every((call) =>
        call.filters.some((filter) => filter.method === 'eq' && filter.args[0] === 'samples.company_id')
      )
    )
  })

  it('does not filter by company when the user has no company_id', async () => {
    const supabase = createMockSupabase({
      'samples:total': 10,
      'samples:received': 4,
      'samples:processing': 1,
      'samples:validation': 2,
      'samples:completed': 3,
      'results:total': 5,
      'results:pending': 1,
      'results:completed': 2,
      'results:validated': 2,
      'reports:total': 3,
      'reports:draft': 1,
      'reports:generated': 1,
      'reports:sent': 1,
      'clients:total': 8,
      'results:validated:today': 1,
      'results:completed:today': 1,
    })

    const stats = await getDashboardStats(supabase, {
      companyId: null,
      completedRangeStart,
      completedRangeEnd,
    })

    assert.equal(stats.overview.activeSamples, 7)
    assert.equal(stats.overview.completedToday, 2)

    const typed = supabase as unknown as { calls: QueryCall[] }
    assert.ok(
      typed.calls.every(
        (call) =>
          !call.filters.some(
            (filter) => filter.method === 'eq' && (filter.args[0] === 'company_id' || filter.args[0] === 'samples.company_id')
          )
      )
    )
    assert.ok(typed.calls.filter((call) => call.table === 'results').every((call) => call.select === 'id'))
  })

  it('fails when a SQL count query errors', async () => {
    const supabase = createMockSupabase(
      {},
      { failLabel: 'samples:total' }
    )

    await assert.rejects(
      () =>
        getDashboardStats(supabase, {
          companyId: 'lab-nemachile',
          completedRangeStart,
          completedRangeEnd,
        }),
      /Error contando muestras: boom/
    )
  })
})
