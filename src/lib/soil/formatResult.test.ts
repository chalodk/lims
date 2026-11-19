import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { formatSoilResultValue } from './formatResult'

describe('formatSoilResultValue', () => {
  it('uses decimal comma', () => {
    assert.equal(formatSoilResultValue({ valueNumeric: 6.45, valueQualifier: null, valueText: null }), '6,45')
  })

  it('keeps the qualifier', () => {
    assert.equal(formatSoilResultValue({ valueNumeric: 0.5, valueQualifier: '<', valueText: null }), '< 0,5')
    assert.equal(formatSoilResultValue({ valueNumeric: null, valueQualifier: 'ND', valueText: null }), 'ND')
  })

  it('writes large counts as powers of ten', () => {
    assert.equal(
      formatSoilResultValue({ valueNumeric: 2.2e7, valueQualifier: null, valueText: null }),
      '2,2 × 10⁷'
    )
  })

  it('returns text results unchanged', () => {
    assert.equal(
      formatSoilResultValue({ valueNumeric: null, valueQualifier: null, valueText: 'Ausencia' }),
      'Ausencia'
    )
  })
})
