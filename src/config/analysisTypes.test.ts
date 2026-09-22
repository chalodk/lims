import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getAnalysisTypeFromKey,
  getAnalysisTypeFromTestArea,
  getAnalysisTypeIndicator,
} from './analysisTypes'

describe('getAnalysisTypeFromKey', () => {
  it('resolves canonical keys', () => {
    assert.equal(getAnalysisTypeFromKey('phytopatology'), 'phytopatology')
    assert.equal(getAnalysisTypeFromKey('virology'), 'virology')
    assert.equal(getAnalysisTypeFromKey('Nematology'), 'nematology')
  })

  it('returns default for unknown or empty keys', () => {
    assert.equal(getAnalysisTypeFromKey(null), 'default')
    assert.equal(getAnalysisTypeFromKey(''), 'default')
    assert.equal(getAnalysisTypeFromKey('unknown_type'), 'default')
  })
})

describe('getAnalysisTypeFromTestArea', () => {
  it('resolves db areas and canonical keys', () => {
    assert.equal(getAnalysisTypeFromTestArea('fitopatologia'), 'phytopatology')
    assert.equal(getAnalysisTypeFromTestArea('nematologia'), 'nematology')
    assert.equal(getAnalysisTypeFromTestArea('virologia'), 'virology')
    assert.equal(getAnalysisTypeFromTestArea('bacteriologia'), 'bacteriology')
    assert.equal(getAnalysisTypeFromTestArea('deteccion_precoz'), 'early_detection')
    assert.equal(getAnalysisTypeFromTestArea('phytopatology'), 'phytopatology')
  })

  it('returns default for empty or unknown areas', () => {
    assert.equal(getAnalysisTypeFromTestArea(null), 'default')
    assert.equal(getAnalysisTypeFromTestArea('suelo'), 'default')
  })
})

describe('getAnalysisTypeIndicator', () => {
  it('returns F, N, V, B, DP for known analysis types', () => {
    assert.equal(getAnalysisTypeIndicator(['fitopatologia']).initial, 'F')
    assert.equal(getAnalysisTypeIndicator(['nematologia']).initial, 'N')
    assert.equal(getAnalysisTypeIndicator(['virologia']).initial, 'V')
    assert.equal(getAnalysisTypeIndicator(['bacteriologia']).initial, 'B')
    assert.equal(getAnalysisTypeIndicator(['deteccion_precoz']).initial, 'DP')
  })

  it('prefers analysis_type when test_areas is empty or unmatched', () => {
    const fromKey = getAnalysisTypeIndicator([], 'phytopatology')
    assert.equal(fromKey.initial, 'F')
    assert.equal(fromKey.key, 'phytopatology')

    const unmatchedAreas = getAnalysisTypeIndicator(['suelo'], 'virology')
    assert.equal(unmatchedAreas.initial, 'V')
    assert.equal(unmatchedAreas.key, 'virology')
  })

  it('returns unknown indicator when both sources are missing', () => {
    const empty = getAnalysisTypeIndicator(null, null)
    assert.equal(empty.initial, '?')
    assert.equal(empty.key, 'default')
  })
})
