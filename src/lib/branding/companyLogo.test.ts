import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import {
  COMPANY_LOGO_MAX_BYTES,
  companyLogoPublicUrl,
  companyLogoStoragePath,
  companyLogoStoragePaths,
  describeCompanyLogoFile,
  isCompanyId,
} from './companyLogo'

const COMPANY_ID = '97efa8ef-de43-491c-9c9f-bdd21a7dbb17'

describe('describeCompanyLogoFile', () => {
  it('accepts png, jpeg, webp and svg content types', () => {
    assert.deepEqual(describeCompanyLogoFile('image/png', 'logo.png'), {
      extension: 'png',
      contentType: 'image/png',
    })
    assert.deepEqual(describeCompanyLogoFile('image/jpeg', 'logo.jpeg'), {
      extension: 'jpg',
      contentType: 'image/jpeg',
    })
    assert.deepEqual(describeCompanyLogoFile('image/webp', 'logo.webp'), {
      extension: 'webp',
      contentType: 'image/webp',
    })
    assert.deepEqual(describeCompanyLogoFile('image/svg+xml;charset=utf-8', 'logo.svg'), {
      extension: 'svg',
      contentType: 'image/svg+xml',
    })
  })

  it('falls back to the filename when the browser omits the content type', () => {
    assert.deepEqual(describeCompanyLogoFile('', 'marca.SVG'), {
      extension: 'svg',
      contentType: 'image/svg+xml',
    })
  })

  it('rejects other formats', () => {
    assert.equal(describeCompanyLogoFile('image/gif', 'logo.gif'), null)
    assert.equal(describeCompanyLogoFile('', 'logo.pdf'), null)
  })
})

describe('company logo storage paths', () => {
  it('builds a path inside the company folder', () => {
    assert.equal(
      companyLogoStoragePath(COMPANY_ID, 'png'),
      `companies/${COMPANY_ID}/logo.png`
    )
  })

  it('lists every extension so a replacement can remove the previous file', () => {
    assert.deepEqual(companyLogoStoragePaths(COMPANY_ID), [
      `companies/${COMPANY_ID}/logo.png`,
      `companies/${COMPANY_ID}/logo.jpg`,
      `companies/${COMPANY_ID}/logo.webp`,
      `companies/${COMPANY_ID}/logo.svg`,
    ])
  })

  it('rejects a company id that is not a uuid', () => {
    assert.equal(isCompanyId('../etc'), false)
    assert.throws(() => companyLogoStoragePath('../etc', 'png'))
  })
})

describe('companyLogoPublicUrl', () => {
  it('appends a cache-busting version', () => {
    assert.equal(
      companyLogoPublicUrl('https://example.supabase.co/storage/v1/object/public/images/logo.png', 10),
      'https://example.supabase.co/storage/v1/object/public/images/logo.png?v=10'
    )
  })
})

describe('COMPANY_LOGO_MAX_BYTES', () => {
  it('caps uploads at 2 MB', () => {
    assert.equal(COMPANY_LOGO_MAX_BYTES, 2 * 1024 * 1024)
  })
})
