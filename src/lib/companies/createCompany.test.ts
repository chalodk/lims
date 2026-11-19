import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  COMPANY_NAME_MAX_LENGTH,
  executeCreateCompany,
  type CreateCompanyRpc,
} from './createCompany'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

function companyRpc() {
  const storedNames = new Set<string>()
  const calls: string[] = []
  const rpc: CreateCompanyRpc = async (companyName) => {
    calls.push(companyName)
    const normalized = companyName.trim().toLowerCase()
    if (storedNames.has(normalized)) {
      return { data: null, error: { code: '23505', message: 'company name already exists' } }
    }
    storedNames.add(normalized)
    return {
      data: {
        id: 'company-1',
        name: companyName,
        plan_tier: 'growth',
        trial_ends_at: '2026-12-01T00:00:00.000Z',
        feature_flags: { producer_portal: false },
        billing_notes: 'nota interna',
        created_by: 'user-csx',
        plan_updated_by: 'user-csx',
      },
      error: null,
    }
  }
  return { rpc, calls }
}

describe('POST /api/admin/companies', () => {
  it('creates a company and returns only the server defaults', async () => {
    const { rpc, calls } = companyRpc()
    const result = await executeCreateCompany(
      {
        name: '  Acme Lab  ',
        plan_tier: 'enterprise',
        feature_flags: { producer_portal: false },
        trial_ends_at: '1999-01-01T00:00:00.000Z',
        created_by: 'someone-else',
      },
      rpc
    )

    assert.deepEqual(calls, ['Acme Lab'])
    assert.equal(result.status, 201)
    if (result.status !== 201) return
    assert.deepEqual(result.body.company, {
      id: 'company-1',
      name: 'Acme Lab',
      plan_tier: 'growth',
      trial_ends_at: '2026-12-01T00:00:00.000Z',
    })
    assert.deepEqual(Object.keys(result.body.company).sort(), [
      'id',
      'name',
      'plan_tier',
      'trial_ends_at',
    ])
  })

  it('rejects an empty, missing, or too long name before calling the RPC', async () => {
    const { rpc, calls } = companyRpc()
    const tooLong = 'a'.repeat(COMPANY_NAME_MAX_LENGTH + 1)

    for (const body of [{}, { name: '   ' }, { name: 12 }, { name: tooLong }, { name: 'Acme\nLab' }]) {
      const result = await executeCreateCompany(body, rpc)
      assert.equal(result.status, 400, JSON.stringify(body))
    }

    assert.deepEqual(calls, [])
  })

  it('returns 409 when the name already exists with different capitalization', async () => {
    const { rpc } = companyRpc()
    const created = await executeCreateCompany({ name: 'Acme Lab' }, rpc)
    const duplicate = await executeCreateCompany({ name: 'acme lab' }, rpc)

    assert.equal(created.status, 201)
    assert.equal(duplicate.status, 409)
    if (duplicate.status === 409) {
      assert.equal(duplicate.body.error, 'Ya existe una compañía con ese nombre')
    }
  })

  it('returns 403 when the RPC rejects a non-csx session', async () => {
    const result = await executeCreateCompany({ name: 'Acme Lab' }, async () => ({
      data: null,
      error: { code: '42501', message: 'not authorized' },
    }))

    assert.equal(result.status, 403)
    if (result.status === 403) {
      assert.equal(result.body.error, 'Acceso denegado')
    }
  })

  it('returns 400 when the RPC rejects the name', async () => {
    const result = await executeCreateCompany({ name: 'Acme Lab' }, async () => ({
      data: null,
      error: { code: '22023', message: 'nombre inválido' },
    }))

    assert.equal(result.status, 400)
  })
})

describe('create_company RPC', () => {
  const sql = readFileSync(join(repoRoot, 'migrations/032_csx_create_company.sql'), 'utf8')
  const route = readFileSync(join(repoRoot, 'src/app/api/admin/companies/route.ts'), 'utf8')
  const postHandler = route.slice(route.indexOf('export const POST'))

  it('allows the insert only through create_company and only for csx', () => {
    assert.match(sql, /IF NOT is_csx\(\)/)
    assert.doesNotMatch(sql, /is_admin\(/)
    assert.match(sql, /REVOKE INSERT ON TABLE public\.companies FROM PUBLIC, anon, authenticated/)
    assert.doesNotMatch(sql, /CREATE POLICY/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.create_company\(text\) TO authenticated/)
    assert.doesNotMatch(sql, /SERVICE_ROLE|service_role/)
    assert.equal((sql.match(/INSERT INTO/gi) || []).length, 1)
    assert.match(sql, /INSERT INTO public\.companies/)
    assert.doesNotMatch(sql, /INSERT INTO public\.users|company_verticals/)
  })

  it('sets plan, trial, flags and created_by in the same insert', () => {
    assert.match(sql, /created_by uuid/)
    assert.match(sql, /plan_tier,\s+feature_flags,\s+trial_started_at,\s+trial_ends_at,\s+plan_updated_at,\s+plan_updated_by,\s+created_by/)
    assert.match(sql, /'growth'/)
    assert.match(sql, /'\{\}'::jsonb/)
    assert.match(sql, /interval '14 days'/)
    assert.match(sql, /auth\.uid\(\),\s+auth\.uid\(\)/)
    assert.match(sql, new RegExp(`char_length\\(normalized_name\\) > ${COMPANY_NAME_MAX_LENGTH}`))
    assert.match(sql, /companies_name_lower_unique/)
    assert.match(sql, /lower\(btrim\(name\)\)/)
    assert.match(sql, /ERRCODE = '23505'/)
  })

  it('wires the route through requireCsx and the RPC, without a table insert', () => {
    const csxCheck = postHandler.indexOf('requireCsx')
    const createCall = postHandler.indexOf('executeCreateCompany')
    assert.ok(csxCheck >= 0)
    assert.ok(createCall > csxCheck)
    assert.match(postHandler, /create_company/)
    assert.match(postHandler, /p_name: companyName/)
    assert.doesNotMatch(postHandler, /\.insert\(|SERVICE_ROLE|service_role/)
  })
})
