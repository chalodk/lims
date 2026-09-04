import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { assembleCompanyPlatformStats } from './companyPlatformStats'

describe('assembleCompanyPlatformStats', () => {
  it('maps RPC counts onto the six-month UI buckets', () => {
    const stats = assembleCompanyPlatformStats(
      {
        company_id: 'lab-1',
        company_name: 'Nemachile',
        clients_total: 4,
        samples: {
          total: 20,
          this_month: 5,
          last_month: 3,
          received: 1,
          processing: 2,
          validation: 0,
          completed: 17,
          by_month: [
            { count: 1 },
            { count: 2 },
            { count: 3 },
            { count: 4 },
            { count: 3 },
            { count: 5 },
          ],
        },
        reports: {
          total: 8,
          this_month: 2,
          last_month: 1,
          completed_total: 6,
          completed_this_month: 2,
          draft: 1,
          generated: 2,
          sent: 3,
          validated: 2,
          by_month: [{ count: 0 }, { count: 1 }, { count: 1 }, { count: 2 }, { count: 1 }, { count: 2 }],
        },
      },
      new Date(2026, 8, 15)
    )

    assert.equal(stats.companyName, 'Nemachile')
    assert.equal(stats.clients.total, 4)
    assert.equal(stats.samples.thisMonth, 5)
    assert.equal(stats.samples.active, 3)
    assert.equal(stats.samples.byMonth[5]?.count, 5)
    assert.equal(stats.reports.completedThisMonth, 2)
    assert.equal(stats.reports.byStatus[2]?.count, 3)
    assert.equal(stats.samples.byType.length, 0)
    assert.equal(stats.reports.byType.length, 0)
  })

  it('merges sample and report type keys onto analysis labels', () => {
    const stats = assembleCompanyPlatformStats(
      {
        company_id: 'lab-1',
        company_name: 'Nemachile',
        clients_total: 1,
        samples: {
          total: 5,
          this_month: 1,
          last_month: 0,
          received: 0,
          processing: 0,
          validation: 0,
          completed: 5,
          by_month: [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 1 }],
          by_type: [
            { type_key: 'virologia', count: 3 },
            { type_key: 'virology', count: 1 },
            { type_key: '', count: 2 },
          ],
        },
        reports: {
          total: 3,
          this_month: 1,
          last_month: 0,
          completed_total: 2,
          completed_this_month: 1,
          draft: 0,
          generated: 0,
          sent: 1,
          validated: 2,
          by_month: [{ count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 0 }, { count: 1 }],
          by_type: [
            { type_key: 'nematologia', count: 2 },
            { type_key: 'default', count: 1 },
          ],
        },
      },
      new Date(2026, 8, 15)
    )

    assert.equal(stats.samples.byType[0]?.key, 'virology')
    assert.equal(stats.samples.byType[0]?.label, 'Virológico')
    assert.equal(stats.samples.byType[0]?.count, 4)
    assert.equal(stats.samples.byType[1]?.key, '__uncategorized__')
    assert.equal(stats.samples.byType[1]?.count, 2)
    assert.equal(stats.reports.byType[0]?.key, 'nematology')
    assert.equal(stats.reports.byType[0]?.label, 'Nematológico')
    assert.equal(stats.reports.byType[1]?.key, '__uncategorized__')
  })
})
