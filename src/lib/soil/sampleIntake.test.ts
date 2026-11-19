import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  createSoilSampleSchema,
  isSoilSampledBy,
  readIsoDate,
  soilSampledByLabel,
  todayIsoDate,
} from './sampleIntake'

const validSample = {
  client_id: '11111111-1111-4111-8111-111111111111',
  code: '1766',
  received_at: '2026-11-19',
  sampled_at: '2026-11-18',
  sampled_by: 'lab',
  notes: '  sector norte  ',
}

describe('alta de muestra de suelo', () => {
  it('acepta toma de muestra y muestreado por el laboratorio', () => {
    const parsed = createSoilSampleSchema.parse(validSample)
    assert.equal(parsed.sampled_at, '2026-11-18')
    assert.equal(parsed.sampled_by, 'lab')
    assert.equal(parsed.notes, 'sector norte')
  })

  it('acepta el muestreo del cliente', () => {
    const parsed = createSoilSampleSchema.parse({ ...validSample, sampled_by: 'client' })
    assert.equal(parsed.sampled_by, 'client')
  })

  it('rechaza una fecha de toma inválida, un muestreado desconocido y un código no numérico', () => {
    for (const body of [
      { ...validSample, sampled_at: '19-11-2026' },
      { ...validSample, sampled_at: '' },
      { ...validSample, sampled_by: 'productor' },
      { ...validSample, sampled_by: '' },
      { ...validSample, code: 'A-12' },
      { ...validSample, received_at: 'hoy' },
    ]) {
      const parsed = createSoilSampleSchema.safeParse(body)
      assert.equal(parsed.success, false)
    }
  })
})

describe('etiquetas de muestreo', () => {
  it('traduce client y lab', () => {
    assert.equal(soilSampledByLabel('client'), 'Cliente')
    assert.equal(soilSampledByLabel('lab'), 'Laboratorio')
    assert.equal(soilSampledByLabel(null), '—')
    assert.equal(isSoilSampledBy('lab'), true)
    assert.equal(isSoilSampledBy('productor'), false)
  })

  it('lee solo fechas ISO y arma la fecha local de hoy', () => {
    assert.equal(readIsoDate('2026-11-19'), '2026-11-19')
    assert.equal(readIsoDate('19/11/2026'), null)
    assert.match(todayIsoDate(), /^\d{4}-\d{2}-\d{2}$/)
  })
})
