import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { buildSoilReportPayload, type ReportPayloadAnalysis, type ReportPayloadSampleInput } from './reportPayload'

const SUELO = 'matrix-suelo'
const FOLIAR = 'matrix-foliar'

const nitrogen: ReportPayloadAnalysis = {
  id: 'n',
  reportTitle: 'N total',
  unit: '%',
  sortOrder: 2,
  matrixIds: [SUELO, FOLIAR],
}

const aluminum: ReportPayloadAnalysis = {
  id: 'al',
  reportTitle: 'Al extractable',
  unit: 'mg/Kg',
  sortOrder: 1,
  matrixIds: [SUELO],
}

function sampleWithResults(): ReportPayloadSampleInput {
  return {
    id: 'sample-1766',
    code: '1766',
    clientName: 'Fundo Norte',
    receivedAt: '2026-11-11',
    subsamples: [
      {
        number: 1,
        results: [
          { analysisId: 'n', valueNumeric: 1.19, valueQualifier: null, valueText: null, unit: '%' },
          { analysisId: 'al', valueNumeric: 4.3, valueQualifier: null, valueText: null, unit: 'mg/Kg' },
          { analysisId: 'missing', valueNumeric: 9, valueQualifier: null, valueText: null, unit: null },
        ],
      },
      {
        number: 2,
        results: [{ analysisId: 'n', valueNumeric: 0.8, valueQualifier: null, valueText: null, unit: '%' }],
      },
    ],
  }
}

describe('buildSoilReportPayload', () => {
  it('keeps results whose analysis applies to the report matrix', () => {
    const payload = buildSoilReportPayload({
      matrixId: SUELO,
      matrixName: 'Suelo',
      analyses: [nitrogen, aluminum],
      samples: [sampleWithResults()],
    })

    assert.equal(payload.samples.length, 1)
    assert.deepEqual(
      payload.samples[0].subsamples[0].results.map((result) => [result.analysisId, result.displayValue]),
      [
        ['al', '4,3'],
        ['n', '1,19'],
      ]
    )
    assert.equal(payload.samples[0].subsamples[1].results[0].analysisId, 'n')
  })

  it('omits a sample that has no result for the selected matrix', () => {
    const payload = buildSoilReportPayload({
      matrixId: FOLIAR,
      matrixName: 'Foliar',
      analyses: [nitrogen, aluminum],
      samples: [
        {
          id: 'sample-only-al',
          code: '1800',
          clientName: null,
          receivedAt: '2026-11-01',
          subsamples: [
            {
              number: 1,
              results: [{ analysisId: 'al', valueNumeric: 1, valueQualifier: null, valueText: null, unit: 'mg/Kg' }],
            },
          ],
        },
      ],
    })

    assert.deepEqual(payload.samples, [])
  })

  it('includes the same value in each matrix the analysis applies to', () => {
    const suelo = buildSoilReportPayload({
      matrixId: SUELO,
      matrixName: 'Suelo',
      analyses: [nitrogen],
      samples: [sampleWithResults()],
    })
    const foliar = buildSoilReportPayload({
      matrixId: FOLIAR,
      matrixName: 'Foliar',
      analyses: [nitrogen],
      samples: [sampleWithResults()],
    })

    assert.equal(suelo.samples[0].subsamples[0].results[0].displayValue, '1,19')
    assert.equal(foliar.samples[0].subsamples[0].results[0].displayValue, '1,19')
    assert.equal(foliar.samples[0].subsamples[0].results.length, 1)
  })

  it('keeps centimoles and leaves out milligrams when both exist for the same title', () => {
    const payload = buildSoilReportPayload({
      matrixId: SUELO,
      matrixName: 'Suelo',
      analyses: [
        { id: 'ca-mg', reportTitle: 'Ca extractable', unit: 'mg/Kg', sortOrder: 1, matrixIds: [SUELO] },
        { id: 'ca-cmol', reportTitle: 'Ca extractable', unit: 'cmol+/Kg', sortOrder: 2, matrixIds: [SUELO] },
      ],
      samples: [
        {
          id: 'sample-1766',
          code: '1766',
          clientName: null,
          receivedAt: '2026-11-11',
          subsamples: [
            {
              number: 1,
              results: [
                { analysisId: 'ca-mg', valueNumeric: 2369, valueQualifier: null, valueText: null, unit: 'mg/Kg' },
                { analysisId: 'ca-cmol', valueNumeric: 11.85, valueQualifier: null, valueText: null, unit: 'cmol+/Kg' },
              ],
            },
          ],
        },
      ],
    })

    assert.deepEqual(
      payload.samples[0].subsamples[0].results.map((result) => result.analysisId),
      ['ca-cmol']
    )
  })

  it('keeps milligrams when the report asks for them', () => {
    const payload = buildSoilReportPayload({
      matrixId: SUELO,
      matrixName: 'Suelo',
      includeMilligramsPerKilogram: true,
      analyses: [
        { id: 'ca-mg', reportTitle: 'Ca extractable', unit: 'mg/Kg', sortOrder: 1, matrixIds: [SUELO] },
        { id: 'ca-cmol', reportTitle: 'Ca extractable', unit: 'cmol+/Kg', sortOrder: 2, matrixIds: [SUELO] },
      ],
      samples: [
        {
          id: 'sample-1766',
          code: '1766',
          clientName: null,
          receivedAt: '2026-11-11',
          subsamples: [
            {
              number: 1,
              results: [
                { analysisId: 'ca-mg', valueNumeric: 2369, valueQualifier: null, valueText: null, unit: 'mg/Kg' },
                { analysisId: 'ca-cmol', valueNumeric: 11.85, valueQualifier: null, valueText: null, unit: 'cmol+/Kg' },
              ],
            },
          ],
        },
      ],
    })

    assert.deepEqual(
      payload.samples[0].subsamples[0].results.map((result) => result.analysisId),
      ['ca-mg']
    )
  })

  it('leaves elemental humic balances out of the product report', () => {
    const analyses: ReportPayloadAnalysis[] = [
      { id: 'eht', reportTitle: 'Extracto húmico total (Base húmeda)', unit: '%', sortOrder: 1, matrixIds: [SUELO], reportSet: 'producto' },
      { id: 'c-eht', reportTitle: 'C-Extracto húmico total (Base húmeda)', unit: '%', sortOrder: 2, matrixIds: [SUELO], reportSet: 'elemental' },
    ]
    const samples: ReportPayloadSampleInput[] = [
      {
        id: 'sample-1687',
        code: '1687',
        clientName: null,
        receivedAt: '2026-11-11',
        subsamples: [
          {
            number: 1,
            results: [
              { analysisId: 'eht', valueNumeric: 3.8, valueQualifier: null, valueText: null, unit: '%' },
              { analysisId: 'c-eht', valueNumeric: 0.55, valueQualifier: null, valueText: null, unit: '%' },
            ],
          },
        ],
      },
    ]
    const product = buildSoilReportPayload({ matrixId: SUELO, matrixName: 'Suelo', analyses, samples })
    const elemental = buildSoilReportPayload({
      matrixId: SUELO,
      matrixName: 'Suelo',
      analyses,
      samples,
      reportMode: 'elemental',
    })

    assert.deepEqual(
      product.samples[0].subsamples[0].results.map((result) => result.analysisId),
      ['eht']
    )
    assert.deepEqual(
      elemental.samples[0].subsamples[0].results.map((result) => result.analysisId),
      ['eht', 'c-eht']
    )
  })
})
