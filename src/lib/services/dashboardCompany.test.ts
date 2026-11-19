import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  pestDashboardReader,
  resolvePestDashboardCompany,
  resolveSoilDashboardCompany,
} from './dashboardCompany'

const labId = '11111111-1111-4111-8111-111111111111'
const otherId = '22222222-2222-4222-8222-222222222222'

const pestLab = { roleName: 'admin', companyId: labId }
const soilLab = { roleName: 'validador', companyId: labId }
const csx = { roleName: 'csx', companyId: null }

describe('resolvePestDashboardCompany', () => {
  it('keeps a laboratory on its own company and ignores a foreign id', () => {
    const scope = resolvePestDashboardCompany(pestLab, otherId)
    assert.deepEqual(scope, { ok: true, companyId: labId })
    assert.equal(pestDashboardReader(pestLab.roleName), 'session')
  })

  it('keeps an unscoped laboratory query when the user has no company', () => {
    const scope = resolvePestDashboardCompany({ roleName: 'admin', companyId: null }, otherId)
    assert.deepEqual(scope, { ok: true, companyId: null })
  })

  it('requires a laboratory id from CSX and reads that company with the service role', () => {
    assert.equal(resolvePestDashboardCompany(csx, null).ok, false)
    assert.equal(resolvePestDashboardCompany(csx, 'no-es-uuid').ok, false)
    const scope = resolvePestDashboardCompany(csx, otherId)
    assert.deepEqual(scope, { ok: true, companyId: otherId })
    assert.equal(pestDashboardReader(csx.roleName), 'service')
  })
})

describe('resolveSoilDashboardCompany', () => {
  const soil = { status: 'assigned', key: 'suelo' } as const
  const pests = { status: 'assigned', key: 'plagas_patogenos' } as const
  const none = { status: 'none' } as const

  it('serves a soil laboratory its own company even if another id is requested', () => {
    const scope = resolveSoilDashboardCompany(soilLab, otherId, soil)
    assert.deepEqual(scope, { ok: true, companyId: labId })
  })

  it('rejects a laboratory whose vertical is not soil', () => {
    const pestsScope = resolveSoilDashboardCompany(pestLab, null, pests)
    const noneScope = resolveSoilDashboardCompany(pestLab, null, none)
    assert.equal(pestsScope.ok, false)
    assert.equal(noneScope.ok, false)
    if (!pestsScope.ok && !noneScope.ok) {
      assert.equal(pestsScope.status, 403)
      assert.equal(noneScope.status, 403)
    }
  })

  it('serves CSX only when the chosen laboratory is soil', () => {
    assert.equal(resolveSoilDashboardCompany(csx, null, soil).ok, false)
    const pestsScope = resolveSoilDashboardCompany(csx, otherId, pests)
    assert.equal(pestsScope.ok, false)
    if (!pestsScope.ok) assert.equal(pestsScope.status, 400)
    const scope = resolveSoilDashboardCompany(csx, otherId, soil)
    assert.deepEqual(scope, { ok: true, companyId: otherId })
  })
})
