import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildSoilPdfMonkeyPayload,
  formatSoilReportTimestamp,
  resolveSoilPdfTemplateId,
  soilReportLogoUrl,
  soilReportPdfFilename,
  SOIL_PDF_TEMPLATE_FALLBACK_ID,
} from './reportPdf'
import type { SoilReportPayload } from './reportPayload'

const createdAt = '2026-11-12T15:00:00.000Z'

function savedReport(): SoilReportPayload {
  return {
    matrixId: 'matrix-suelo',
    matrixName: 'Suelo',
    client: {
      name: 'Fundo Norte',
      billingRut: '76.123.456-7',
      contactName: 'Ana Soto',
      contactEmail: 'ana@fundo.cl',
    },
    samples: [
      {
        id: 'sample-1766',
        code: '1766',
        clientName: 'Fundo Norte',
        receivedAt: '2026-11-11',
        sampledBy: 'client',
        condition: 'apta',
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
    assert.equal(document.logo, null)
    assert.equal(document.cliente, 'Fundo Norte')
    assert.equal(document.rut_facturacion, '76.123.456-7')
    assert.equal(document.contacto, 'Ana Soto')
    assert.equal(document.email, 'ana@fundo.cl')
    assert.equal(document.matriz, 'Suelo')
    assert.equal(document.fecha, formatSoilReportTimestamp(createdAt))
    assert.equal(document.muestras.length, 1)
    assert.equal(document.muestras[0].codigo, '1766')
    assert.equal(document.muestras[0].recepcion, '11 de noviembre de 2026')
    assert.equal(document.muestras[0].muestreado_por, 'Cliente')
    assert.equal(document.muestras[0].condicion, 'Apta para análisis')
    assert.equal(document.muestras[0].tipo, 'Suelo')
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
    payload.client = { name: null, billingRut: null, contactName: null, contactEmail: null }
    payload.samples[0].clientName = null
    payload.samples[0].sampledBy = 'lab'
    payload.samples[0].condition = 'no_apta'
    const document = buildSoilPdfMonkeyPayload({
      payload,
      laboratoryName: 'Agroanalytics',
      createdAt: 'fecha-no-valida',
    })

    assert.equal(document.cliente, 'Sin cliente')
    assert.equal(document.rut_facturacion, '')
    assert.equal(document.muestras[0].muestreado_por, 'Laboratorio')
    assert.equal(document.muestras[0].condicion, 'No apta para análisis')
    assert.equal(document.fecha, 'fecha-no-valida')
  })

  it('passes the company logo when it is an https url', () => {
    const logoUrl = 'https://example.supabase.co/storage/v1/object/public/images/companies/logo.svg?v=1'
    const document = buildSoilPdfMonkeyPayload({
      payload: savedReport(),
      laboratoryName: 'Agriservice',
      logoUrl,
      createdAt,
    })

    assert.equal(document.logo, logoUrl)
    assert.equal(soilReportLogoUrl('  http://inseguro.example/logo.png  '), null)
    assert.equal(soilReportLogoUrl('   '), null)
    assert.equal(soilReportLogoUrl(null), null)
  })

  it('names the file with the client and the matrix', () => {
    assert.equal(soilReportPdfFilename('Cliente test', 'Suelo'), 'Cliente_test_suelo.pdf')
    assert.equal(soilReportPdfFilename('Fundo Norte', 'Compost'), 'Fundo_Norte_compost.pdf')
    assert.equal(soilReportPdfFilename('  Cliente / test:  ', 'Suelo'), 'Cliente_test_suelo.pdf')
    assert.equal(soilReportPdfFilename('', 'Suelo'), 'Sin_cliente_suelo.pdf')
    assert.equal(soilReportPdfFilename('Sin cliente', ''), 'Sin_cliente_matriz.pdf')
  })

  it('uses the soil template when the environment variable is missing', () => {
    assert.equal(resolveSoilPdfTemplateId(undefined), SOIL_PDF_TEMPLATE_FALLBACK_ID)
    assert.equal(resolveSoilPdfTemplateId('   '), SOIL_PDF_TEMPLATE_FALLBACK_ID)
    assert.equal(resolveSoilPdfTemplateId('  template-custom  '), 'template-custom')
  })
})
