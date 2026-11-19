import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { resolveSoilLabAccess } from './soilAccess'

function dependencies(
  profile: { companyId: string | null; roleName: string | null } | null,
  hasSoilVertical = true
) {
  return {
    loadUserProfile: async () => profile,
    companyHasSoilVertical: async () => hasSoilVertical,
  }
}

describe('resolveSoilLabAccess', () => {
  it('allows a lab user of a company with the suelo vertical', async () => {
    const access = await resolveSoilLabAccess(dependencies({ companyId: 'company-1', roleName: 'validador' }))
    assert.deepEqual(access, { ok: true, companyId: 'company-1', roleName: 'validador' })
  })

  it('rejects a company without the suelo vertical', async () => {
    const access = await resolveSoilLabAccess(
      dependencies({ companyId: 'company-1', roleName: 'admin' }, false)
    )
    assert.equal(access.ok, false)
    assert.equal(access.ok ? null : access.status, 403)
  })

  it('rejects consumers and csx', async () => {
    for (const roleName of ['consumidor', 'csx', null]) {
      const access = await resolveSoilLabAccess(dependencies({ companyId: 'company-1', roleName }))
      assert.equal(access.ok, false, `role ${roleName}`)
    }
  })

  it('rejects a user without company', async () => {
    const access = await resolveSoilLabAccess(dependencies({ companyId: null, roleName: 'admin' }))
    assert.equal(access.ok ? null : access.status, 403)
  })

  it('returns 500 when the profile cannot be loaded', async () => {
    const access = await resolveSoilLabAccess(dependencies(null))
    assert.equal(access.ok ? null : access.status, 500)
  })
})
