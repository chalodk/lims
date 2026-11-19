import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { isPublicPage, redirectsAuthenticatedUserToApp, SET_PASSWORD_PATH } from './publicRoutes'

describe('set password route', () => {
  it('is public and does not send an authenticated user to the dashboard', () => {
    assert.equal(isPublicPage(SET_PASSWORD_PATH), true)
    assert.equal(redirectsAuthenticatedUserToApp(SET_PASSWORD_PATH), false)
    assert.equal(redirectsAuthenticatedUserToApp('/login'), true)
    assert.equal(isPublicPage('/dashboard'), false)
  })
})
