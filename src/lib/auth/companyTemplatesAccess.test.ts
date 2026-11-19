import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')

describe('company template writes', () => {
  const migration = readFileSync(join(repoRoot, 'migrations/034_csx_only_company_templates.sql'), 'utf8')
  const collectionRoute = readFileSync(join(repoRoot, 'src/app/api/admin/company-templates/route.ts'), 'utf8')
  const itemRoute = readFileSync(join(repoRoot, 'src/app/api/admin/company-templates/[id]/route.ts'), 'utf8')

  it('drops the laboratory admin write policy and leaves read and CSX write in place', () => {
    assert.match(migration, /DROP POLICY IF EXISTS "Enable write for company admins"/)
    assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "Enable read for authenticated users"/)
    assert.doesNotMatch(migration, /DROP POLICY IF EXISTS "Enable write for csx"/)
    assert.doesNotMatch(migration, /DELETE FROM public\.company_analysis_type_templates/)
  })

  it('accepts only CSX on list, save and delete', () => {
    assert.equal((collectionRoute.match(/requireCsx\(/g) || []).length, 2)
    assert.equal((itemRoute.match(/requireCsx\(/g) || []).length, 1)
    assert.doesNotMatch(collectionRoute, /role !== 'admin'|role === 'admin'/)
    assert.doesNotMatch(itemRoute, /role !== 'admin'|role === 'admin'/)
  })
})
