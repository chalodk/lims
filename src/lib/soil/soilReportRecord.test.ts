import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  consumerCanSeeSoilReport,
  shouldRejectPhytosanitaryPdf,
  singleSoilReportClientId,
  storedSoilPdfUrls,
} from './soilReportRecord'

describe('singleSoilReportClientId', () => {
  it('rechaza muestras de dos clientes y no entrega un id para insertar', () => {
    const decision = singleSoilReportClientId(['client-a', 'client-b'])
    assert.equal(decision.ok, false)
    if (!decision.ok) {
      assert.match(decision.error, /un cliente/)
    }
  })

  it('acepta varias muestras del mismo cliente', () => {
    const decision = singleSoilReportClientId(['client-a', 'client-a'])
    assert.deepEqual(decision, { ok: true, clientId: 'client-a' })
  })
})

describe('shouldRejectPhytosanitaryPdf', () => {
  it('corta el generador de fitosanidad cuando el informe es de suelo', () => {
    assert.equal(shouldRejectPhytosanitaryPdf('suelo'), true)
    assert.equal(shouldRejectPhytosanitaryPdf('phytopatology'), false)
    assert.equal(shouldRejectPhytosanitaryPdf(null), false)
  })
})

describe('consumerCanSeeSoilReport', () => {
  it('oculta el borrador y el informe de otro cliente', () => {
    const linked = ['client-a']
    assert.equal(consumerCanSeeSoilReport({ completed: false, clientId: 'client-a' }, linked), false)
    assert.equal(consumerCanSeeSoilReport({ completed: true, clientId: 'client-b' }, linked), false)
    assert.equal(consumerCanSeeSoilReport({ completed: true, clientId: 'client-a' }, linked), true)
  })
})

describe('storedSoilPdfUrls', () => {
  it('deja la URL https en rendered_pdf_url', () => {
    const stored = storedSoilPdfUrls('https://pdfmonkey.example/informe.pdf')
    assert.equal(stored?.renderedPdfUrl, 'https://pdfmonkey.example/informe.pdf')
    assert.equal(storedSoilPdfUrls('http://inseguro.example/informe.pdf'), null)
  })
})
