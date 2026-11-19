import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import type { SupabaseServerClient } from './api-auth'
import { requireCsx } from './requireCsx'

function supabaseReturningRole(roleName: string | string[] | null, fails = false): SupabaseServerClient {
  const client = {
    from(table: string) {
      assert.equal(table, 'users')
      return {
        select(columns: string) {
          assert.equal(columns, 'role_id, roles(name)')
          return {
            eq(column: string, userId: string) {
              assert.equal(column, 'id')
              assert.equal(userId, 'user-1')
              return {
                async single() {
                  if (fails) return { data: null, error: { message: 'db down' } }
                  if (!roleName) return { data: null, error: { message: 'not found' } }
                  const roles = Array.isArray(roleName)
                    ? roleName.map((name) => ({ name }))
                    : { name: roleName }
                  return { data: { role_id: 5, roles }, error: null }
                },
              }
            },
          }
        },
      }
    },
  }
  return client as unknown as SupabaseServerClient
}

describe('requireCsx', () => {
  it('allows a csx user', async () => {
    const access = await requireCsx(supabaseReturningRole('csx'), 'user-1')
    assert.equal(access.ok, true)
  })

  it('allows a csx user when the role join returns an array', async () => {
    const access = await requireCsx(supabaseReturningRole(['csx']), 'user-1')
    assert.equal(access.ok, true)
  })

  it('rejects admin and laboratory roles', async () => {
    for (const roleName of ['admin', 'validador', 'comun', 'consumidor']) {
      const access = await requireCsx(supabaseReturningRole(roleName), 'user-1')
      assert.equal(access.ok, false, roleName)
      if (access.ok) continue
      assert.equal(access.response.status, 403)
      const body = await access.response.json()
      assert.equal(body.error, 'Acceso denegado')
    }
  })

  it('returns 500 when the profile cannot be loaded', async () => {
    const missing = await requireCsx(supabaseReturningRole(null), 'user-1')
    const failed = await requireCsx(supabaseReturningRole('csx', true), 'user-1')
    assert.equal(missing.ok, false)
    assert.equal(failed.ok, false)
    if (!missing.ok) assert.equal(missing.response.status, 500)
    if (!failed.ok) assert.equal(failed.response.status, 500)
  })
})
