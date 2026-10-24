import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { extractFindingsNormalizedRows } from './findingsNormalizedService'

describe('extractFindingsNormalizedRows isolation', () => {
  it('creates one row per isolated microorganism', () => {
    const rows = extractFindingsNormalizedRows({
      resultId: 'result-1',
      sampleId: 'sample-1',
      findings: {
        type: 'fitopatologia',
        tableFormat: 'tissue_isolation',
        tests: [
          {
            sampleNumber: '2686',
            tissue: 'Corona\nInjerto',
            microorganisms: [
              { name: 'Verticillium sp.', is_sag_zero_tolerance: true },
              { name: ' ', is_sag_zero_tolerance: false },
              { name: 'Fusarium sp.', is_sag_zero_tolerance: false },
            ],
          },
          {
            sampleNumber: '2687',
            microorganisms: [{ name: 'Penicillium sp.', is_sag_zero_tolerance: false }],
          },
        ],
      },
    })

    assert.deepEqual(
      rows.map((row) => ({
        source_index: row.source_index,
        pathogen_name: row.pathogen_name,
        is_sag_zero_tolerance: row.is_sag_zero_tolerance,
        quantity: row.quantity,
      })),
      [
        { source_index: 0, pathogen_name: 'Verticillium sp.', is_sag_zero_tolerance: true, quantity: null },
        { source_index: 1, pathogen_name: 'Fusarium sp.', is_sag_zero_tolerance: false, quantity: null },
        { source_index: 2, pathogen_name: 'Penicillium sp.', is_sag_zero_tolerance: false, quantity: null },
      ]
    )
  })

  it('keeps colony-count rows indexed by the test position', () => {
    const rows = extractFindingsNormalizedRows({
      resultId: 'result-1',
      sampleId: 'sample-1',
      findings: {
        type: 'fitopatologia',
        tests: [
          { microorganism: '', dilutions: { '10-1': '1' } },
          { microorganism: 'Penicillium sp.', dilutions: { '10-1': '35' } },
        ],
      },
    })

    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.source_index, 1)
    assert.equal(rows[0]?.pathogen_name, 'Penicillium sp.')
  })
})
