import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  buildIsolationReportPayload,
  joinSintomatologia,
  mapIsolationResultados,
} from './phytopathologyIsolation'

const isolationFindings = {
  type: 'fitopatologia',
  tableFormat: 'tissue_isolation',
  sintomatologia: '<p>Clorosis en corona</p>',
  tests: [
    {
      sampleNumber: '2686',
      identification: 'Una parra variedad Red Globe',
      tissue: 'Corona\nInjerto',
      microorganisms: [
        { name: 'Verticillium sp.', is_sag_zero_tolerance: false },
        { name: 'Fusarium sp.', is_sag_zero_tolerance: false },
      ],
    },
  ],
}

describe('mapIsolationResultados', () => {
  it('stacks isolated microorganisms in one row', () => {
    const rows = mapIsolationResultados([
      { findings: isolationFindings, samples: { code: '2686' } },
    ])
    assert.equal(rows.length, 1)
    assert.equal(rows[0]?.numeroMuestra, '2686')
    assert.equal(rows[0]?.tejidoAnalizado, 'Corona\nInjerto')
    assert.deepEqual(rows[0]?.microorganismosAislados, ['Verticillium sp.', 'Fusarium sp.'])
  })

  it('falls back when a result has no isolation rows', () => {
    const rows = mapIsolationResultados([{ findings: { type: 'fitopatologia', tests: [] } }])
    assert.equal(rows[0]?.microorganismosAislados[0], 'No se aislaron microorganismos')
  })
})

describe('buildIsolationReportPayload', () => {
  it('places sintomatologia next to diagnostico', () => {
    const payload = buildIsolationReportPayload({
      numeroInforme: '2026-001',
      tituloInforme: 'INFORME FITOPATOLÓGICO',
      informacionSolicitante: { productor: 'Productor' },
      tipoMuestraDescripcion: 'Tejido',
      metodologiaDescripcion: 'Aislamiento',
      diagnosticoDescripcion: '<p>Diagnóstico</p>',
      sintomatologiaDescripcion: joinSintomatologia([
        { findings: isolationFindings },
        { findings: { sintomatologia: '<p>Necrosis</p>' } },
      ]),
      notaResultados: 'Nota',
      columnLabels: { tissue: 'Tejido analizado' },
      analista: { nombre: 'Analista' },
      resultados: mapIsolationResultados([{ findings: isolationFindings }]),
    })

    assert.equal(payload.formatoTabla, 'aislamiento')
    assert.deepEqual(Object.keys(payload), [
      'numeroInforme',
      'tituloInforme',
      'formatoTabla',
      'informacionSolicitante',
      'tipoMuestra',
      'metodologia',
      'resultados',
      'sintomatologia',
      'diagnostico',
      'notaResultados',
      'columnLabels',
      'analista',
    ])
    const sintomatologia = payload.sintomatologia as { descripcion: string }
    const diagnostico = payload.diagnostico as { descripcion: string }
    assert.match(sintomatologia.descripcion, /Clorosis en corona/)
    assert.match(sintomatologia.descripcion, /Necrosis/)
    assert.match(diagnostico.descripcion, /Diagnóstico/)
    assert.equal('resultados' in payload, true)
    assert.equal(
      (payload.resultados as Array<{ microorganismosAislados: string[] }>)[0]?.microorganismosAislados.length,
      2
    )
  })
})
