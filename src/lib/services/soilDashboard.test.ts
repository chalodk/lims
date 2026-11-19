import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseClient } from '@supabase/supabase-js'
import {
  assembleSoilDashboard,
  countReportsByMatrix,
  countSoilSamplesByStatus,
  getSoilDashboard,
  readSoilImportSummary,
} from './soilDashboard'

const companyId = '11111111-1111-4111-8111-111111111111'

describe('soil dashboard assembly', () => {
  it('counts samples by the three soil statuses and drops unknown ones', () => {
    assert.deepEqual(
      countSoilSamplesByStatus(['received', 'received', 'in_analysis', 'completed', 'validation']),
      { received: 2, in_analysis: 1, completed: 1 }
    )
  })

  it('reads import counts and treats a missing summary as zero', () => {
    assert.deepEqual(
      readSoilImportSummary({ resultCount: 12, sampleCount: 3, warningCount: 1, newSampleCodes: ['A'] }),
      { resultCount: 12, sampleCount: 3, warningCount: 1 }
    )
    assert.deepEqual(readSoilImportSummary(null), { resultCount: 0, sampleCount: 0, warningCount: 0 })
  })

  it('groups reports by matrix name', () => {
    const reports = countReportsByMatrix([
      { soil_matrices: { key: 'suelo', name: 'Suelo' } },
      { soil_matrices: [{ key: 'agua', name: 'Agua' }] },
      { soil_matrices: { key: 'suelo', name: 'Suelo' } },
      { soil_matrices: null },
    ])
    assert.deepEqual(reports, [
      { matrixKey: 'agua', matrixName: 'Agua', reportCount: 1 },
      { matrixKey: 'suelo', matrixName: 'Suelo', reportCount: 2 },
    ])
  })

  it('assembles the three blocks from raw rows', () => {
    const dashboard = assembleSoilDashboard({
      sampleStatuses: ['completed'],
      imports: [
        {
          id: 'import-1',
          file_name: 'marzo.xlsx',
          created_at: '2026-03-01T00:00:00.000Z',
          summary: { resultCount: 4, sampleCount: 2, warningCount: 0 },
        },
      ],
      reports: [{ soil_matrices: { key: 'compost', name: 'Compost' } }],
    })
    assert.equal(dashboard.samplesByStatus.completed, 1)
    assert.equal(dashboard.recentImports[0]?.fileName, 'marzo.xlsx')
    assert.equal(dashboard.recentImports[0]?.resultCount, 4)
    assert.equal(dashboard.reportsByMatrix[0]?.matrixName, 'Compost')
  })
})

describe('getSoilDashboard', () => {
  it('filters samples, imports and reports by the requested company', async () => {
    const filters: { table: string; companyId: unknown }[] = []

    const from = (table: string) => {
      const builder = {
        select() {
          return builder
        },
        eq(column: string, value: unknown) {
          if (column === 'company_id') filters.push({ table, companyId: value })
          return builder
        },
        order() {
          return builder
        },
        limit() {
          return builder
        },
        then(
          onFulfilled: (value: { data: unknown[]; error: null }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          const data =
            table === 'soil_samples'
              ? [{ status: 'received' }]
              : table === 'soil_result_imports'
                ? []
                : [{ soil_matrices: { key: 'suelo', name: 'Suelo' } }]
          return Promise.resolve({ data, error: null }).then(onFulfilled, onRejected)
        },
      }
      return builder
    }

    const dashboard = await getSoilDashboard({ from } as unknown as SupabaseClient, companyId)
    assert.deepEqual(
      filters.map((filter) => filter.table).sort(),
      ['soil_reports', 'soil_result_imports', 'soil_samples']
    )
    assert.ok(filters.every((filter) => filter.companyId === companyId))
    assert.equal(dashboard.samplesByStatus.received, 1)
    assert.equal(dashboard.reportsByMatrix[0]?.reportCount, 1)
  })

  it('fails when a soil query returns an error', async () => {
    const from = () => {
      const builder = {
        select() {
          return builder
        },
        eq() {
          return builder
        },
        order() {
          return builder
        },
        limit() {
          return builder
        },
        then(
          onFulfilled: (value: { data: null; error: { message: string } }) => unknown,
          onRejected?: (reason: unknown) => unknown
        ) {
          return Promise.resolve({ data: null, error: { message: 'boom' } }).then(onFulfilled, onRejected)
        },
      }
      return builder
    }

    await assert.rejects(
      () => getSoilDashboard({ from } as unknown as SupabaseClient, companyId),
      /muestras de suelo/
    )
  })
})
