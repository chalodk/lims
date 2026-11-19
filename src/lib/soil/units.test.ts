import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { convertToCatalogUnit } from './units'

describe('convertToCatalogUnit', () => {
  it('keeps the value when units match ignoring case, spaces and µ variant', () => {
    assert.equal(convertToCatalogUnit(440, 'µS/cm', 'μS/cm'), 440)
    assert.equal(convertToCatalogUnit(1.2, 'mS/cm ', 'ms/cm'), 1.2)
  })

  it('converts conductivity between µS/cm, mS/cm and dS/m', () => {
    assert.equal(convertToCatalogUnit(440, 'µS/cm', 'dS/m'), 0.44)
    assert.equal(convertToCatalogUnit(1.5, 'mS/cm', 'dS/m'), 1.5)
    assert.equal(convertToCatalogUnit(0.8, 'mS/cm', 'μS/cm'), 800)
  })

  it('returns null when there is no known conversion', () => {
    assert.equal(convertToCatalogUnit(10, 'mg/L', 'dS/m'), null)
    assert.equal(convertToCatalogUnit(10, null, 'dS/m'), null)
  })
})
