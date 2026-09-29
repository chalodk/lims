import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  parseSpeciesFamilyQuery,
  resolveSpeciesFamily,
  sampleMatchesSpeciesFamily,
} from './speciesFamilies'

describe('parseSpeciesFamilyQuery', () => {
  it('leaves the detail unfiltered when the family is omitted', () => {
    const parsed = parseSpeciesFamilyQuery(null)
    assert.equal(parsed.ok, true)
    if (!parsed.ok) return
    assert.equal(parsed.family, null)
  })

  it('accepts a known family and rejects an unknown one', () => {
    const carozos = parseSpeciesFamilyQuery('carozos')
    const unknown = parseSpeciesFamilyQuery('damascos')
    assert.equal(carozos.ok, true)
    if (!carozos.ok) return
    assert.equal(carozos.family?.key, 'carozos')
    assert.equal(unknown.ok, false)
  })
})

describe('sampleMatchesSpeciesFamily', () => {
  const carozos = resolveSpeciesFamily('carozos')
  const desconocido = resolveSpeciesFamily('desconocido')

  it('matches catalog names ignoring case and accents', () => {
    assert.ok(carozos)
    assert.equal(sampleMatchesSpeciesFamily('Cerezo de Japón', carozos), true)
    assert.equal(sampleMatchesSpeciesFamily('cerezo de japon', carozos), true)
    assert.equal(sampleMatchesSpeciesFamily('Damasco', carozos), false)
    assert.equal(sampleMatchesSpeciesFamily('Manzano', carozos), false)
  })

  it('matches only the Desconocido species for that filter', () => {
    assert.ok(desconocido)
    assert.equal(sampleMatchesSpeciesFamily('Desconocido', desconocido), true)
    assert.equal(sampleMatchesSpeciesFamily('desconocido', desconocido), true)
    assert.equal(sampleMatchesSpeciesFamily('', desconocido), false)
    assert.equal(sampleMatchesSpeciesFamily(null, desconocido), false)
    assert.equal(sampleMatchesSpeciesFamily('Vid', desconocido), false)
  })

  it('keeps every species when no family is selected', () => {
    assert.equal(sampleMatchesSpeciesFamily('Damasco', null), true)
    assert.equal(sampleMatchesSpeciesFamily('Desconocido', null), true)
    assert.equal(sampleMatchesSpeciesFamily(null, null), true)
  })
})
