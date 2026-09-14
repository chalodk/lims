import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { getAppBrandingIdFromHostname } from './hostBranding'

describe('getAppBrandingIdFromHostname', () => {
  it('uses generic branding for lims.agroanalytics.cl', () => {
    assert.equal(getAppBrandingIdFromHostname('lims.agroanalytics.cl'), 'generic')
  })

  it('uses nemachile branding for app.nemachile.cl', () => {
    assert.equal(getAppBrandingIdFromHostname('app.nemachile.cl'), 'nemachile')
  })
})
