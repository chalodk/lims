import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  codesForSampleIds,
  reportMatchesSampleCode,
  sampleIdsFromReportPayload,
} from './reportSampleCodes'

describe('códigos del listado de informes', () => {
  it('resuelve los códigos desde soil_samples y el filtro usa esos códigos', () => {
    const payload = {
      samples: [
        { id: 'sample-1890', code: 'texto de planilla' },
        { id: 'sample-1901', code: 'Suelo' },
        { id: 'sample-1890', code: 'duplicado' },
      ],
    }
    const sampleIds = sampleIdsFromReportPayload(payload)
    const codeBySampleId = new Map([
      ['sample-1890', '1890'],
      ['sample-1901', '1901'],
    ])
    const sampleCodes = codesForSampleIds(sampleIds, codeBySampleId)

    assert.deepEqual(sampleIds, ['sample-1890', 'sample-1901'])
    assert.deepEqual(sampleCodes, ['1890', '1901'])
    assert.equal(reportMatchesSampleCode(sampleCodes, '1890'), true)
    assert.equal(reportMatchesSampleCode(sampleCodes, '  190 '), true)
    assert.equal(reportMatchesSampleCode(sampleCodes, 'planilla'), false)
    assert.equal(reportMatchesSampleCode(sampleCodes, 'Suelo'), false)
    assert.equal(reportMatchesSampleCode(sampleCodes, '   '), true)
  })

  it('omite la muestra que ya no está en soil_samples', () => {
    const sampleCodes = codesForSampleIds(
      ['sample-1890', 'sample-borrada'],
      new Map([['sample-1890', '1890']])
    )
    assert.deepEqual(sampleCodes, ['1890'])
    assert.equal(reportMatchesSampleCode(sampleCodes, 'borrada'), false)
  })
})
