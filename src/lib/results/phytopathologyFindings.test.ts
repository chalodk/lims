import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIsolationFindings,
  MIXED_PHYTOPATHOLOGY_FORMAT_MESSAGE,
  NO_PATHOGEN_DEVELOPMENT_LABEL,
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
          noPathogenDevelopment: false,
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
    assert.equal(findings?.tests[0]?.noPathogenDevelopment, false)
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
            noPathogenDevelopment: false,
            microorganisms: [{ name: '', is_sag_zero_tolerance: false }],
          },
        ],
      }),
      null
    )
  })

  it('keeps a tissue marked without pathogen development and drops its microorganisms', () => {
    const findings = buildIsolationFindings({
      sintomatologia: '',
      tests: [
        {
          sampleNumber: '2686',
          identification: 'Parra',
          tissue: 'Corona',
          noPathogenDevelopment: true,
          microorganisms: [{ name: 'Fusarium sp.', is_sag_zero_tolerance: true }],
        },
        {
          sampleNumber: '2686',
          identification: 'Parra',
          tissue: 'Injerto',
          noPathogenDevelopment: false,
          microorganisms: [{ name: 'Verticillium sp.', is_sag_zero_tolerance: false }],
        },
      ],
    })

    assert.equal(findings?.tests.length, 2)
    assert.equal(findings?.tests[0]?.noPathogenDevelopment, true)
    assert.deepEqual(findings?.tests[0]?.microorganisms, [])
    assert.equal(findings?.tests[1]?.tissue, 'Injerto')
    assert.equal(findings?.tests[1]?.microorganisms[0]?.name, 'Verticillium sp.')

    const reloaded = parseIsolationTests(findings)
    assert.equal(reloaded[0]?.noPathogenDevelopment, true)
    assert.equal(reloaded[0]?.tissue, 'Corona')
    assert.equal(reloaded[0]?.microorganisms[0]?.name, '')
    assert.equal(reloaded[1]?.noPathogenDevelopment, false)
    assert.equal(NO_PATHOGEN_DEVELOPMENT_LABEL, 'Sin desarrollo de patógenos')
  })

  it('reads legacy isolation rows as pathogen development', () => {
    const tests = parseIsolationTests({
      type: 'fitopatologia',
      tableFormat: 'tissue_isolation',
      tests: [
        {
          sampleNumber: '1',
          tissue: 'Hoja',
          microorganisms: [{ name: 'Botrytis sp.', is_sag_zero_tolerance: false }],
        },
      ],
    })

    assert.equal(tests[0]?.noPathogenDevelopment, false)
    assert.equal(tests[0]?.microorganisms[0]?.name, 'Botrytis sp.')
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
