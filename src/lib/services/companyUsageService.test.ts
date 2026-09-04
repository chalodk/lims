import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { snapshotFromBillingRpcRow } from './companyUsageService'

describe('snapshotFromBillingRpcRow', () => {
  it('maps RPC billing rows onto usage snapshots', () => {
    const snapshot = snapshotFromBillingRpcRow(
      {
        id: 'lab-1',
        name: 'Nemachile',
        plan_tier: 'starter',
        billing_notes: 'Factura mensual',
        trial_started_at: null,
        trial_ends_at: null,
        samples_this_month: 12,
        client_count: 4,
      },
      new Date(2026, 8, 15)
    )

    assert.equal(snapshot.companyId, 'lab-1')
    assert.equal(snapshot.companyName, 'Nemachile')
    assert.equal(snapshot.planTier, 'starter')
    assert.equal(snapshot.samplesThisMonth, 12)
    assert.equal(snapshot.clientCount, 4)
    assert.equal(snapshot.billingNotes, 'Factura mensual')
  })
})
