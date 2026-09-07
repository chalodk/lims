import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getColumnLabel,
  getDefaultColumnLabels,
  mergeColumnLabels,
  resolvePdfColumnLabels,
  resolveResultColumnLabels,
} from './columnLabels'

describe('getDefaultColumnLabels', () => {
  it('returns nematology defaults used by the PDF template fallback', () => {
    const labels = getDefaultColumnLabels('nematology')
    assert.equal(labels.name, 'Género y/o especie identificada')
    assert.equal(labels.quantity, 'N° nematodos/250 cm³ de suelo')
  })

  it('returns a copy so callers cannot mutate the registry', () => {
    const labels = getDefaultColumnLabels('nematology')
    labels.quantity = 'mutated'
    assert.equal(getDefaultColumnLabels('nematology').quantity, 'N° nematodos/250 cm³ de suelo')
  })
})

describe('mergeColumnLabels', () => {
  it('overlays user labels on nematology defaults', () => {
    const merged = mergeColumnLabels('nematology', { quantity: 'N° nematodos/100 g de raíz' })
    assert.equal(merged.name, 'Género y/o especie identificada')
    assert.equal(merged.quantity, 'N° nematodos/100 g de raíz')
  })
})

describe('getColumnLabel', () => {
  it('reads a saved label from findings', () => {
    const findings = { columnLabels: { quantity: 'Custom quantity' } }
    assert.equal(getColumnLabel(findings, 'nematology', 'quantity'), 'Custom quantity')
  })

  it('falls back to nematology defaults when findings have no labels', () => {
    const findings = { type: 'nematologia_negative', nematodes: [] }
    assert.equal(
      getColumnLabel(findings, 'nematology', 'quantity'),
      'N° nematodos/250 cm³ de suelo'
    )
  })
})

describe('resolvePdfColumnLabels', () => {
  it('returns saved labels merged with defaults', () => {
    const labels = resolvePdfColumnLabels(
      [{ findings: { columnLabels: { quantity: 'N° / 100 g' } } }],
      'nematology'
    )
    assert.equal(labels.quantity, 'N° / 100 g')
    assert.equal(labels.name, 'Género y/o especie identificada')
  })

  it('returns nematology defaults when no result has columnLabels', () => {
    const labels = resolvePdfColumnLabels(
      [{ findings: { type: 'nematologia_negative', nematodes: [{ name: 'Sin presencia de nemátodos', quantity: '0' }] } }],
      'nematology'
    )
    assert.equal(labels.quantity, 'N° nematodos/250 cm³ de suelo')
    assert.equal(labels.name, 'Género y/o especie identificada')
  })

  it('uses defaults when the first result has empty columnLabels', () => {
    const labels = resolvePdfColumnLabels(
      [{ findings: { columnLabels: {} } }],
      'nematology'
    )
    assert.equal(labels.quantity, 'N° nematodos/250 cm³ de suelo')
  })

  it('does not borrow a sibling result custom quantity', () => {
    const labels = resolvePdfColumnLabels(
      [
        { findings: { type: 'nematologia_negative', nematodes: [] } },
        { findings: { columnLabels: { quantity: 'N° nematodos/10 gramos de raices ' } } },
      ],
      'nematology'
    )
    assert.equal(labels.quantity, 'N° nematodos/250 cm³ de suelo')
  })
})

describe('resolveResultColumnLabels', () => {
  it('returns this result saved labels merged with defaults', () => {
    const labels = resolveResultColumnLabels(
      { columnLabels: { quantity: 'N° nematodos/10 gramos de raices ' } },
      'nematology'
    )
    assert.equal(labels.quantity, 'N° nematodos/10 gramos de raices ')
    assert.equal(labels.name, 'Género y/o especie identificada')
  })
})
