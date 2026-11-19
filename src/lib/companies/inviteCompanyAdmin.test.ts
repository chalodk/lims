import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  ADMIN_NAME_MAX_LENGTH,
  adminSetPasswordRedirect,
  adminSetPasswordUrl,
  executeInviteCompanyAdmin,
  mergeCompanyAdminEmails,
  type InviteCompanyAdminDeps,
} from './inviteCompanyAdmin'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const companyId = '11111111-1111-4111-8111-111111111111'
const companyName = 'Acme Lab'
const redirectTo = 'https://lab.example/auth/establecer-contrasena'

function deps(overrides: Partial<InviteCompanyAdminDeps> = {}) {
  const invites: { email: string; userName: string; companyName: string; redirectTo: string }[] = []
  const profiles: { userId: string; companyId: string; name: string; email: string }[] = []
  const deleted: string[] = []
  const base: InviteCompanyAdminDeps = {
    emailIsRegistered: async () => ({ registered: false, error: null }),
    inviteAdmin: async (input) => {
      invites.push(input)
      return { userId: 'user-1', error: null }
    },
    createProfile: async (input) => {
      profiles.push(input)
      return {
        data: {
          id: input.userId,
          name: input.name,
          email: input.email,
          role: 'admin',
          password: 'no-debe-salir',
        },
        error: null,
      }
    },
    deleteAuthUser: async (userId) => {
      deleted.push(userId)
    },
  }
  return { deps: { ...base, ...overrides }, invites, profiles, deleted }
}

describe('POST /api/admin/companies/[id]/admin', () => {
  it('invites the admin and returns no password', async () => {
    const harness = deps()
    const result = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      {
        name: '  Ada Admin  ',
        email: 'Ada@Lab.cl',
        role: 'csx',
        company_id: '22222222-2222-4222-8222-222222222222',
      },
      redirectTo,
      harness.deps
    )

    assert.equal(result.status, 201)
    if (result.status !== 201) return
    assert.deepEqual(result.body, {
      invited: true,
      user: { id: 'user-1', name: 'Ada Admin', email: 'ada@lab.cl' },
    })
    assert.equal('password' in result.body, false)
    assert.equal('password' in result.body.user, false)
    assert.deepEqual(harness.invites, [
      { email: 'ada@lab.cl', userName: 'Ada Admin', companyName, redirectTo },
    ])
    assert.equal('role' in harness.invites[0], false)
    assert.deepEqual(harness.profiles, [
      { userId: 'user-1', companyId, name: 'Ada Admin', email: 'ada@lab.cl' },
    ])
    assert.deepEqual(harness.deleted, [])
  })

  it('rejects an empty name or invalid email before inviting', async () => {
    const harness = deps()
    const emptyName = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: '   ', email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )
    const invalidEmail = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'Ada', email: 'no-es-email' },
      redirectTo,
      harness.deps
    )
    const tooLong = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'a'.repeat(ADMIN_NAME_MAX_LENGTH + 1), email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )

    assert.equal(emptyName.status, 400)
    assert.equal(invalidEmail.status, 400)
    assert.equal(tooLong.status, 400)
    assert.deepEqual(harness.invites, [])
  })

  it('returns 409 when the email is already registered', async () => {
    const harness = deps({
      emailIsRegistered: async () => ({ registered: true, error: null }),
    })
    const result = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'Ada', email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )

    assert.equal(result.status, 409)
    if (result.status === 409) {
      assert.equal(result.body.error, 'El email ya está registrado')
    }
    assert.deepEqual(harness.invites, [])
  })

  it('returns 409 and rolls back when the company already has a user', async () => {
    const harness = deps({
      createProfile: async () => ({
        data: null,
        error: { code: '23505', message: 'company already has a user' },
      }),
    })
    const result = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'Ada', email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )

    assert.equal(result.status, 409)
    if (result.status === 409) {
      assert.equal(result.body.error, 'Esta compañía ya tiene un usuario')
    }
    assert.deepEqual(harness.deleted, ['user-1'])
  })

  it('does not delete an account that already existed', async () => {
    const harness = deps({
      inviteAdmin: async () => ({
        userId: 'existing-user',
        error: { code: 'email_exists', message: 'A user with this email address has already been registered' },
      }),
    })
    const result = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'Ada', email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )

    assert.equal(result.status, 409)
    assert.deepEqual(harness.deleted, [])
    assert.deepEqual(harness.profiles, [])
  })

  it('returns 403 when the RPC rejects a non-csx session', async () => {
    const harness = deps({
      emailIsRegistered: async () => ({
        registered: false,
        error: { code: '42501', message: 'not authorized' },
      }),
    })
    const result = await executeInviteCompanyAdmin(
      companyId,
      companyName,
      { name: 'Ada', email: 'ada@lab.cl' },
      redirectTo,
      harness.deps
    )

    assert.equal(result.status, 403)
    assert.deepEqual(harness.invites, [])
  })
})

describe('mergeCompanyAdminEmails', () => {
  it('attaches the first admin email only for companies that have one', () => {
    const rows = mergeCompanyAdminEmails(
      [
        { id: 'company-1', name: 'Acme' },
        { id: 'company-2', name: 'Beta' },
      ],
      [
        { company_id: 'company-1', email: 'ada@acme.cl', password: 'no' },
        { company_id: 'missing', email: '' },
      ]
    )

    assert.deepEqual(rows, [
      { id: 'company-1', name: 'Acme', firstAdminEmail: 'ada@acme.cl' },
      { id: 'company-2', name: 'Beta', firstAdminEmail: null },
    ])
  })
})

describe('create_company_first_admin RPC', () => {
  const sql = readFileSync(join(repoRoot, 'migrations/033_csx_invite_company_admin.sql'), 'utf8')
  const route = readFileSync(
    join(repoRoot, 'src/app/api/admin/companies/[id]/admin/route.ts'),
    'utf8'
  )
  const page = readFileSync(join(repoRoot, 'src/app/admin/companies/page.tsx'), 'utf8')

  it('locks an empty company and inserts only the admin role for csx', () => {
    assert.equal((sql.match(/IF NOT is_csx\(\)/g) || []).length, 3)
    assert.match(sql, /FOR UPDATE/)
    assert.match(sql, /WHERE name = 'admin'/)
    assert.doesNotMatch(sql, /p_role|listUsers|email_confirm/)
    assert.match(sql, /company already has a user/)
    assert.match(sql, /email already registered/)
    assert.match(sql, new RegExp(`char_length\\(normalized_name\\) > ${ADMIN_NAME_MAX_LENGTH}`))
    assert.equal((sql.match(/INSERT INTO public\.users/g) || []).length, 1)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_company_first_admin/)
  })

  it('wires the route through requireCsx and inviteUserByEmail', () => {
    const csxCheck = route.indexOf('requireCsx')
    const inviteCall = route.indexOf('inviteUserByEmail')
    assert.ok(csxCheck >= 0)
    assert.ok(inviteCall > csxCheck)
    assert.match(route, /getRequestOrigin/)
    assert.match(route, /adminSetPasswordUrl/)
    assert.match(route, /data: \{ companyName, userName, setPasswordUrl: inviteRedirectTo \}/)
    assert.equal(
      adminSetPasswordRedirect('https://lab.example'),
      'https://lab.example/auth/establecer-contrasena'
    )
    assert.equal(
      adminSetPasswordUrl('http://localhost:3001'),
      'http://localhost:3001/auth/establecer-contrasena'
    )
    assert.equal(
      adminSetPasswordUrl('http://127.0.0.1:3000'),
      'http://127.0.0.1:3000/auth/establecer-contrasena'
    )
    assert.equal(
      adminSetPasswordUrl('https://app.nemachile.cl'),
      'https://lims.agroanalytics.cl/auth/establecer-contrasena'
    )
    assert.equal(
      adminSetPasswordUrl('https://lims.agroanalytics.cl'),
      'https://lims.agroanalytics.cl/auth/establecer-contrasena'
    )
    assert.match(route, /deleteUser/)
    assert.doesNotMatch(route, /listUsers|sendUserCredentialsToWebhook|email_confirm|!#2026#!/)
    assert.match(page, /JSON\.stringify\(\{ name: adminName, email: adminEmail \}\)/)
    assert.match(page, /confirmar el correo/)
  })
})
