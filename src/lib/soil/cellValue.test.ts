import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { normalizeSampleCode, parseSoilCellValue, parseSubsampleNumber } from './cellValue'

function numericValue(cell: string | number) {
  const parsed = parseSoilCellValue(cell)
  assert.equal(parsed.kind, 'numeric')
  return parsed.kind === 'numeric' ? parsed : null
}

describe('parseSoilCellValue', () => {
  it('reads plain numbers and decimal commas', () => {
    assert.equal(numericValue(7.13)?.valueNumeric, 7.13)
    assert.equal(numericValue('7,13')?.valueNumeric, 7.13)
  })

  it('reads 10ⁿ notation with superscripts and stray spaces', () => {
    assert.equal(numericValue('2,6*10⁵')?.valueNumeric, 260000)
    assert.equal(numericValue('2,2*10 ⁵')?.valueNumeric, 220000)
    assert.equal(numericValue('1,3 *10⁶')?.valueNumeric, 1300000)
    assert.equal(numericValue('9*10⁴')?.valueNumeric, 90000)
    assert.equal(numericValue('3,7*10¹⁰')?.valueNumeric, 37000000000)
  })

  it('reads censored values with their qualifier', () => {
    const belowDetection = numericValue('<3')
    assert.equal(belowDetection?.valueNumeric, 3)
    assert.equal(belowDetection?.qualifier, '<')
    const belowScientific = numericValue('<1*10³ ')
    assert.equal(belowScientific?.valueNumeric, 1000)
    assert.equal(belowScientific?.qualifier, '<')
  })

  it('reads ND as a numeric result without value', () => {
    const notDetected = numericValue('ND')
    assert.equal(notDetected?.valueNumeric, null)
    assert.equal(notDetected?.qualifier, 'ND')
  })

  it('flags formula errors and keeps free text as text', () => {
    assert.deepEqual(parseSoilCellValue('#DIV/0!'), { kind: 'formula_error', raw: '#DIV/0!' })
    assert.deepEqual(parseSoilCellValue('Franco arenoso'), {
      kind: 'text',
      valueText: 'Franco arenoso',
      raw: 'Franco arenoso',
    })
  })

  it('treats null and blank cells as empty', () => {
    assert.deepEqual(parseSoilCellValue(null), { kind: 'empty' })
    assert.deepEqual(parseSoilCellValue('   '), { kind: 'empty' })
  })
})

describe('sample codes', () => {
  it('normalizes numeric codes and rejects control rows', () => {
    assert.equal(normalizeSampleCode(1813), '1813')
    assert.equal(normalizeSampleCode('1813.0'), '1813')
    assert.equal(normalizeSampleCode('BCO 1'), null)
    assert.equal(normalizeSampleCode('Sol. saturante '), null)
    assert.equal(normalizeSampleCode(1.5), null)
  })

  it('parses subsample numbers', () => {
    assert.equal(parseSubsampleNumber(2), 2)
    assert.equal(parseSubsampleNumber('-'), null)
    assert.equal(parseSubsampleNumber(0), null)
  })
})
