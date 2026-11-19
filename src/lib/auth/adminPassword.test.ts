import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { validateAdminPassword } from './adminPassword'

describe('validateAdminPassword', () => {
  it('accepts two matching passwords of at least 8 characters', () => {
    assert.deepEqual(validateAdminPassword('clave-segura', 'clave-segura'), { ok: true })
  })

  it('rejects a short password and a mismatch', () => {
    const short = validateAdminPassword('corta', 'corta')
    const mismatch = validateAdminPassword('clave-segura', 'otra-clave')
    assert.equal(short.ok, false)
    assert.equal(mismatch.ok, false)
  })
})
