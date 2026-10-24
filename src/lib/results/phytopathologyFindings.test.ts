import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIsolationFindings,
  MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE,
  parseIsolationTests,
  readPhytopathologyTableFormat,
  readSintomatologia,
  resolvePhytopathologyReportVariant,
} from './phytopathologyFindings'

describe('readPhytopathologyTableFormat', () => {
  it('treats legacy findings without tableFormat as colony count', () => {
    assert.equal(
      readPhytopathologyTableFormat({
        type: 'fitopatologia',
        tests: [{ microorganism: 'Penicillium sp.', dilutions: { '10-1': '35' } }],
      }),
      'colony_count'
    )
  })

  it('reads the isolation format', () => {
    assert.equal(
      readPhytopathologyTableFormat({ type: 'fitopatologia', tableFormat: 'tissue_isolation', tests: [] }),
      'tissue_isolation'
    )
  })
})

describe('buildIsolationFindings', () => {
  it('keeps named microorganisms and drops blank selectors', () => {
    const findings = buildIsolationFindings({
      sintomatologia: '<p>Clorosis</p>',
      tests: [
        {
          sampleNumber: ' 2686 ',
          identification: ' Una parra ',
          tissue: 'Corona\nInjerto',
          microorganisms: [
            { name: 'Verticillium sp.', is_sag_zero_tolerance: false },
            { name: '  ', is_sag_zero_tolerance: true },
            { name: 'Fusarium sp.', is_sag_zero_tolerance: true },
          ],
        },
      ],
    })

    assert.ok(findings)
    assert.equal(findings?.tableFormat, 'tissue_isolation')
    assert.equal(findings?.sintomatologia, '<p>Clorosis</p>')
    assert.equal(findings?.tests[0]?.microorganisms.length, 2)
    assert.equal(findings?.tests[0]?.microorganisms[1]?.is_sag_zero_tolerance, true)
    assert.equal(readSintomatologia(findings), '<p>Clorosis</p>')
    assert.equal(parseIsolationTests(findings)[0]?.tissue, 'Corona\nInjerto')
  })

  it('returns null when the table and sintomatologia are empty', () => {
    assert.equal(
      buildIsolationFindings({
        sintomatologia: '   ',
        tests: [
          {
            sampleNumber: '',
            identification: '',
            tissue: '',
            microorganisms: [{ name: '', is_sag_zero_tolerance: false }],
          },
        ],
      }),
      null
    )
  })
})

describe('resolvePhytopathologyReportVariant', () => {
  it('rejects a report that mixes both phytopathology tables', () => {
    const variant = resolvePhytopathologyReportVariant([
      {
        test_area: 'fitopatologia',
        findings: { type: 'fitopatologia', tableFormat: 'colony_count', tests: [] },
      },
      {
        test_area: 'fitopatologia',
        findings: { type: 'fitopatologia', tableFormat: 'tissue_isolation', tests: [] },
      },
    ])
    assert.equal(variant, 'mixed')
    assert.match(MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE, /mezcle/)
  })

  it('ignores other analysis areas when every phytopathology result uses isolation', () => {
    const variant = resolvePhytopathologyReportVariant([
      { test_area: 'virologia', findings: { type: 'virologia', tests: [] } },
      {
        test_area: 'fitopatologia',
        findings: { type: 'fitopatologia', tableFormat: 'tissue_isolation', tests: [] },
      },
    ])
    assert.equal(variant, 'tissue_isolation')
  })

  it('returns null when there are no phytopathology results', () => {
    assert.equal(
      resolvePhytopathologyReportVariant([{ test_area: 'nematologia', findings: { type: 'nematologia_positive' } }]),
      null
    )
  })
})
