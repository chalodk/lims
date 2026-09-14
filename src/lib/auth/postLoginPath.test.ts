import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getPostLoginPath } from './postLoginPath'

describe('getPostLoginPath', () => {
  it('sends consumidor users to the client portal', () => {
    assert.equal(getPostLoginPath('consumidor'), '/cliente')
  })

  it('sends laboratory roles to the dashboard', () => {
    assert.equal(getPostLoginPath('admin'), '/dashboard')
    assert.equal(getPostLoginPath('analista'), '/dashboard')
  })

  it('falls back to the dashboard when the role is missing', () => {
    assert.equal(getPostLoginPath(undefined), '/dashboard')
  })
})
