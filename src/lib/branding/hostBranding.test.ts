import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  getAppBrandingIdFromHostname,
  getRequestOrigin,
  getSocialPreviewImage,
  LIMS_LOGO_URL,
  NEMACHILE_LOGO_URL,
} from './hostBranding'

describe('getAppBrandingIdFromHostname', () => {
  it('uses generic branding for lims.agroanalytics.cl', () => {
    assert.equal(getAppBrandingIdFromHostname('lims.agroanalytics.cl'), 'generic')
  })

  it('uses nemachile branding for app.nemachile.cl', () => {
    assert.equal(getAppBrandingIdFromHostname('app.nemachile.cl'), 'nemachile')
  })
})

describe('getSocialPreviewImage', () => {
  it('uses the current LIMS logo for SaaS share thumbnails', () => {
    assert.deepEqual(getSocialPreviewImage('generic'), {
      url: LIMS_LOGO_URL,
      alt: 'LIMS Agroanalytics',
      width: 2000,
      height: 2000,
    })
  })

  it('keeps the Nemachile logo for Nemachile share thumbnails', () => {
    assert.equal(getSocialPreviewImage('nemachile').url, NEMACHILE_LOGO_URL)
  })
})

describe('getRequestOrigin', () => {
  it('prefers x-forwarded-host and https in production', () => {
    assert.equal(
      getRequestOrigin('localhost:3001', 'lims.agroanalytics.cl', 'https'),
      'https://lims.agroanalytics.cl'
    )
  })

  it('forces https for public hosts even if the proxy sends http', () => {
    assert.equal(
      getRequestOrigin('lims.agroanalytics.cl', null, 'http'),
      'https://lims.agroanalytics.cl'
    )
  })
})
