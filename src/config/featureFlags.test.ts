import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  compactFeatureFlagOverrides,
  mergeFeatureFlagOverrides,
  parseFeatureFlagOverrides,
  resolveCompanyFeatures,
} from './featureFlags'

describe('resolveCompanyFeatures', () => {
  it('defaults producer_portal ON and the rest OFF', () => {
    const resolved = resolveCompanyFeatures()
    assert.equal(resolved.producer_portal, true)
    assert.equal(resolved.ai_reports, false)
    assert.equal(resolved.payments, false)
  })

  it('applies producer_portal override OFF', () => {
    const resolved = resolveCompanyFeatures({ producer_portal: false })
    assert.equal(resolved.producer_portal, false)
    assert.equal(resolved.ai_reports, false)
    assert.equal(resolved.payments, false)
  })

  it('merges a partial override without resetting other defaults', () => {
    const resolved = resolveCompanyFeatures({ ai_reports: true })
    assert.equal(resolved.producer_portal, true)
    assert.equal(resolved.ai_reports, true)
    assert.equal(resolved.payments, false)
  })

  it('forces payments OFF when producer_portal is OFF', () => {
    const resolved = resolveCompanyFeatures({
      producer_portal: false,
      payments: true,
    })
    assert.equal(resolved.producer_portal, false)
    assert.equal(resolved.payments, false)
  })
})

describe('mergeFeatureFlagOverrides', () => {
  it('stores only diffs vs defaults', () => {
    const stored = mergeFeatureFlagOverrides({}, { producer_portal: false })
    assert.deepEqual(stored, { producer_portal: false })
  })

  it('drops producer_portal override when turning it back ON', () => {
    const stored = mergeFeatureFlagOverrides({ producer_portal: false }, { producer_portal: true })
    assert.deepEqual(stored, {})
  })

  it('does not persist payments ON if the resulting portal is OFF', () => {
    const stored = mergeFeatureFlagOverrides({ producer_portal: false }, { payments: true })
    assert.equal(stored.payments, undefined)
    assert.equal(stored.producer_portal, false)
    const resolved = resolveCompanyFeatures(stored)
    assert.equal(resolved.payments, false)
  })

  it('persists payments ON when portal stays ON', () => {
    const stored = mergeFeatureFlagOverrides({}, { payments: true })
    assert.deepEqual(stored, { payments: true })
  })
})

describe('parseFeatureFlagOverrides', () => {
  it('ignores unknown keys and non-booleans', () => {
    const parsed = parseFeatureFlagOverrides({
      producer_portal: false,
      unknown: true,
      ai_reports: 'yes',
    })
    assert.deepEqual(parsed, { producer_portal: false })
  })
})

describe('compactFeatureFlagOverrides', () => {
  it('omits keys that match registry defaults', () => {
    const compact = compactFeatureFlagOverrides({
      producer_portal: true,
      ai_reports: false,
      payments: false,
    })
    assert.deepEqual(compact, {})
  })
})
