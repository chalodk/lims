import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isRouteAllowedForVertical, resolveSessionVertical } from './verticals'

describe('resolveSessionVertical', () => {
  it('uses the active primary row', () => {
    const resolved = resolveSessionVertical([
      { active: true, is_primary: false, vertical_key: 'plagas_patogenos' },
      { active: true, is_primary: true, vertical_key: 'suelo' },
    ])
    assert.deepEqual(resolved, { status: 'assigned', key: 'suelo' })
  })

  it('returns none when the company has no rows (no plagas fallback)', () => {
    assert.deepEqual(resolveSessionVertical([]), { status: 'none' })
  })

  it('returns none when the primary row is inactive', () => {
    const resolved = resolveSessionVertical([
      { active: false, is_primary: true, vertical_key: 'plagas_patogenos' },
    ])
    assert.deepEqual(resolved, { status: 'none' })
  })

  it('returns none when there are active rows but none is primary', () => {
    const resolved = resolveSessionVertical([
      { active: true, is_primary: false, vertical_key: 'suelo' },
    ])
    assert.deepEqual(resolved, { status: 'none' })
  })

  it('returns none for an unknown vertical key', () => {
    const resolved = resolveSessionVertical([
      { active: true, is_primary: true, vertical_key: 'agua' },
    ])
    assert.deepEqual(resolved, { status: 'none' })
  })
})

describe('isRouteAllowedForVertical', () => {
  const plagas = { status: 'assigned', key: 'plagas_patogenos' } as const
  const suelo = { status: 'assigned', key: 'suelo' } as const
  const none = { status: 'none' } as const

  it('keeps plagas routes for plagas companies only', () => {
    assert.equal(isRouteAllowedForVertical('/samples', plagas), true)
    assert.equal(isRouteAllowedForVertical('/results/123', plagas), true)
    assert.equal(isRouteAllowedForVertical('/samples', suelo), false)
    assert.equal(isRouteAllowedForVertical('/reports', none), false)
  })

  it('keeps suelo routes for suelo companies only', () => {
    assert.equal(isRouteAllowedForVertical('/suelo/muestras', suelo), true)
    assert.equal(isRouteAllowedForVertical('/suelo', plagas), false)
  })

  it('does not gate shared routes', () => {
    assert.equal(isRouteAllowedForVertical('/dashboard', none), true)
    assert.equal(isRouteAllowedForVertical('/clients', suelo), true)
    assert.equal(isRouteAllowedForVertical('/samplesheet', suelo), true)
  })
})
