import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSoilPdfMonkeyPayload,
  formatSoilReportTimestamp,
  resolveSoilPdfTemplateId,
  SOIL_PDF_TEMPLATE_FALLBACK_ID,
} from './reportPdf'
import type { SoilReportPayload } from './reportPayload'

const createdAt = '2026-11-12T15:00:00.000Z'

function savedReport(): SoilReportPayload {
  return {
    matrixId: 'matrix-suelo',
    matrixName: 'Suelo',
    samples: [
      {
        id: 'sample-1766',
        code: '1766',
        clientName: 'Fundo Norte',
        receivedAt: '2026-11-11',
        subsamples: [
          {
            number: 1,
            results: [
              {
                analysisId: 'al',
                reportTitle: 'Al extractable',
                unit: 'mg/Kg',
                valueNumeric: 4.3,
                valueQualifier: null,
                valueText: null,
                displayValue: '4,3',
              },
              {
                analysisId: 'n',
                reportTitle: 'N total',
                unit: '%',
                valueNumeric: 1.19,
                valueQualifier: null,
                valueText: null,
                displayValue: '1,19',
              },
            ],
          },
          {
            number: 2,
            results: [
              {
                analysisId: 'n',
                reportTitle: 'N total',
                unit: '%',
                valueNumeric: 0.8,
                valueQualifier: null,
                valueText: null,
                displayValue: '0,8',
              },
            ],
          },
        ],
      },
    ],
  }
}

describe('buildSoilPdfMonkeyPayload', () => {
  it('includes the matrix, sample code and visible values', () => {
    const document = buildSoilPdfMonkeyPayload({
      payload: savedReport(),
      laboratoryName: 'Agroanalytics',
      createdAt,
    })

    assert.equal(document.laboratorio, 'Agroanalytics')
    assert.equal(document.matriz, 'Suelo')
    assert.equal(document.fecha, formatSoilReportTimestamp(createdAt))
    assert.equal(document.muestras.length, 1)
    assert.equal(document.muestras[0].codigo, '1766')
    assert.equal(document.muestras[0].cliente, 'Fundo Norte')
    assert.equal(document.muestras[0].recepcion, '2026-11-11')
    assert.deepEqual(
      document.muestras[0].analisis.map((analysis) => [analysis.titulo, analysis.unidad]),
      [
        ['Al extractable', 'mg/Kg'],
        ['N total', '%'],
      ]
    )
    assert.deepEqual(document.muestras[0].filas, [
      { submuestra: '1766-1', valores: ['4,3', '1,19'] },
      { submuestra: '1766-2', valores: ['', '0,8'] },
    ])
  })

  it('labels a sample without a client and keeps an unreadable date as given', () => {
    const payload = savedReport()
    payload.samples[0].clientName = null
    const document = buildSoilPdfMonkeyPayload({
      payload,
      laboratoryName: 'Agroanalytics',
      createdAt: 'fecha-no-valida',
    })

    assert.equal(document.muestras[0].cliente, 'Sin cliente')
    assert.equal(document.fecha, 'fecha-no-valida')
  })

  it('uses the soil template when the environment variable is missing', () => {
    assert.equal(resolveSoilPdfTemplateId(undefined), SOIL_PDF_TEMPLATE_FALLBACK_ID)
    assert.equal(resolveSoilPdfTemplateId('   '), SOIL_PDF_TEMPLATE_FALLBACK_ID)
    assert.equal(resolveSoilPdfTemplateId('  template-custom  '), 'template-custom')
  })
})
