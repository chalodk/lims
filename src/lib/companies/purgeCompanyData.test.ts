import { describe, it } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import {
  confirmCompanyName,
  executeCompanyOperationalCounts,
  executePurgeCompanyOperationalData,
  type CompanyOperationalCountsDependencies,
  type PurgeCompanyOperationalDependencies,
} from './purgeCompanyData'

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '../../..')
const soilCompanyId = '11111111-1111-4111-8111-111111111111'
const companyName = 'Agriservice'

const purgedPayload = {
  soil_samples: 4,
  soil_results: 12,
  soil_reports: 2,
  storage_paths: [`${soilCompanyId}/import.xlsx`],
}

function countDependencies(
  overrides: Partial<CompanyOperationalCountsDependencies> = {}
): CompanyOperationalCountsDependencies & { calls: string[] } {
  const calls: string[] = []
  return {
    calls,
    loadCompany: async (companyId) => {
      calls.push(`load:${companyId}`)
      return { name: companyName }
    },
    countOperationalData: async (companyId) => {
      calls.push(`count:${companyId}`)
      return { data: purgedPayload, error: null }
    },
    ...overrides,
  }
}

function purgeDependencies(
  overrides: Partial<PurgeCompanyOperationalDependencies> = {}
): PurgeCompanyOperationalDependencies & { calls: string[]; removed: string[][] } {
  const calls: string[] = []
  const removed: string[][] = []
  return {
    calls,
    removed,
    loadCompany: async (companyId) => {
      calls.push(`load:${companyId}`)
      return { name: companyName }
    },
    purgeOperationalData: async (companyId) => {
      calls.push(`purge:${companyId}`)
      return { data: purgedPayload, error: null }
    },
    removeImportFiles: async (storagePaths) => {
      calls.push('storage')
      removed.push(storagePaths)
      return []
    },
    ...overrides,
  }
}

describe('confirmación de limpieza', () => {
  it('acepta el nombre exacto con espacios alrededor', () => {
    assert.deepEqual(confirmCompanyName(`  ${companyName}  `, companyName), { ok: true })
  })

  it('rechaza un nombre vacío, ausente o distinto antes de llamar al RPC', async () => {
    const dependencies = purgeDependencies()

    for (const body of [{}, { confirmName: '   ' }, { confirmName: 12 }, { confirmName: 'agriservice' }]) {
      const result = await executePurgeCompanyOperationalData(soilCompanyId, body, dependencies)
      assert.equal(result.status, 400, JSON.stringify(body))
      if (result.status === 400) {
        assert.ok(result.body.error.length > 0)
      }
    }

    assert.deepEqual(
      dependencies.calls.filter((call) => call.startsWith('purge') || call === 'storage'),
      []
    )
  })
})

describe('conteos y limpieza de un laboratorio de suelo', () => {
  it('devuelve los conteos de suelo cuando la compañía existe', async () => {
    const dependencies = countDependencies()
    const result = await executeCompanyOperationalCounts(soilCompanyId, dependencies)

    assert.equal(result.status, 200)
    if (result.status !== 200) return
    assert.deepEqual(result.body.counts, {
      soilSamples: 4,
      soilResults: 12,
      soilReports: 2,
    })
    assert.deepEqual(dependencies.calls, [`load:${soilCompanyId}`, `count:${soilCompanyId}`])
  })

  it('borra la data y luego los archivos de importación cuando el nombre coincide', async () => {
    const dependencies = purgeDependencies()
    const result = await executePurgeCompanyOperationalData(
      soilCompanyId,
      { confirmName: companyName },
      dependencies
    )

    assert.equal(result.status, 200)
    if (result.status !== 200) return
    assert.deepEqual(result.body.counts, {
      soilSamples: 4,
      soilResults: 12,
      soilReports: 2,
    })
    assert.equal(result.body.storageWarning, undefined)
    assert.deepEqual(dependencies.calls, [
      `load:${soilCompanyId}`,
      `purge:${soilCompanyId}`,
      'storage',
    ])
    assert.deepEqual(dependencies.removed, [[`${soilCompanyId}/import.xlsx`]])
  })

  it('informa que la base quedó limpia si el storage falla', async () => {
    const dependencies = purgeDependencies({
      removeImportFiles: async () => {
        throw new Error('storage caído')
      },
    })
    const result = await executePurgeCompanyOperationalData(
      soilCompanyId,
      { confirmName: companyName },
      dependencies
    )

    assert.equal(result.status, 200)
    if (result.status !== 200) return
    assert.match(result.body.storageWarning || '', /base quedó limpia/)
    assert.deepEqual(result.body.failedStoragePaths, [`${soilCompanyId}/import.xlsx`])
    assert.equal(result.logMessage, 'storage caído')
  })
})

describe('rechazos de limpieza', () => {
  it('responde 404 si la compañía no existe y no llama al RPC', async () => {
    const countCalls: string[] = []
    const purgeCalls: string[] = []
    const missingCompany = async () => null

    const counts = await executeCompanyOperationalCounts(
      soilCompanyId,
      countDependencies({
        loadCompany: missingCompany,
        countOperationalData: async (companyId) => {
          countCalls.push(companyId)
          return { data: purgedPayload, error: null }
        },
      })
    )
    const purge = await executePurgeCompanyOperationalData(
      soilCompanyId,
      { confirmName: companyName },
      purgeDependencies({
        loadCompany: missingCompany,
        purgeOperationalData: async (companyId) => {
          purgeCalls.push(companyId)
          return { data: purgedPayload, error: null }
        },
      })
    )

    assert.equal(counts.status, 404)
    assert.equal(purge.status, 404)
    assert.deepEqual(countCalls, [])
    assert.deepEqual(purgeCalls, [])
  })

  it('responde 404 si el id no es un uuid', async () => {
    const dependencies = purgeDependencies()
    const result = await executePurgeCompanyOperationalData(
      'agriservice',
      { confirmName: companyName },
      dependencies
    )

    assert.equal(result.status, 404)
    assert.deepEqual(dependencies.calls, [])
  })

  it('responde 403 si la compañía no es un laboratorio de suelo y no borra archivos', async () => {
    const dependencies = purgeDependencies({
      purgeOperationalData: async () => ({
        data: null,
        error: { code: '42501', message: 'not a soil company' },
      }),
    })
    const result = await executePurgeCompanyOperationalData(
      soilCompanyId,
      { confirmName: companyName },
      dependencies
    )

    assert.equal(result.status, 403)
    if (result.status === 403) {
      assert.equal(result.body.error, 'Solo se puede limpiar un laboratorio de suelo')
    }
    assert.equal(dependencies.calls.includes('storage'), false)
  })

  it('responde 403 si la sesión no es CSX', async () => {
    const counts = await executeCompanyOperationalCounts(
      soilCompanyId,
      countDependencies({
        countOperationalData: async () => ({
          data: null,
          error: { code: '42501', message: 'not authorized' },
        }),
      })
    )
    const purge = await executePurgeCompanyOperationalData(
      soilCompanyId,
      { confirmName: companyName },
      purgeDependencies({
        purgeOperationalData: async () => ({
          data: null,
          error: { code: '42501', message: 'not authorized' },
        }),
      })
    )

    assert.equal(counts.status, 403)
    assert.equal(purge.status, 403)
    if (counts.status === 403) assert.equal(counts.body.error, 'Acceso denegado')
    if (purge.status === 403) assert.equal(purge.body.error, 'Acceso denegado')
  })

  it('responde 403 al pedir conteos de un laboratorio que no es de suelo', async () => {
    const result = await executeCompanyOperationalCounts(
      soilCompanyId,
      countDependencies({
        countOperationalData: async () => ({
          data: null,
          error: { code: '42501', message: 'not a soil company' },
        }),
      })
    )

    assert.equal(result.status, 403)
    if (result.status === 403) {
      assert.equal(result.body.error, 'Solo se puede limpiar un laboratorio de suelo')
    }
  })
})

describe('csx purge SQL y rutas', () => {
  const sql = readFileSync(
    join(repoRoot, 'migrations/035_csx_purge_company_operational_data.sql'),
    'utf8'
  )
  const countsRoute = readFileSync(
    join(repoRoot, 'src/app/api/admin/companies/[id]/operational-data/route.ts'),
    'utf8'
  )
  const purgeRoute = readFileSync(
    join(repoRoot, 'src/app/api/admin/companies/[id]/purge/route.ts'),
    'utf8'
  )
  const page = readFileSync(join(repoRoot, 'src/app/admin/limpieza/page.tsx'), 'utf8')

  it('solo borra tablas de suelo y exige CSX con vertical primaria suelo', () => {
    assert.match(sql, /IF NOT is_csx\(\)/)
    assert.match(sql, /cv\.active/)
    assert.match(sql, /cv\.is_primary/)
    assert.match(sql, /v\.key = 'suelo'/)
    assert.equal((sql.match(/PERFORM public\.assert_csx_primary_soil_company/g) || []).length, 2)
    assert.deepEqual(sql.match(/DELETE FROM public\.\w+/g), [
      'DELETE FROM public.soil_reports',
      'DELETE FROM public.soil_samples',
      'DELETE FROM public.soil_result_imports',
    ])
    assert.doesNotMatch(sql, /DELETE FROM public\.(samples|results|reports|soil_analyses)\b/)
    assert.match(sql, /storage_paths/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.csx_company_operational_counts\(uuid\) TO authenticated/)
    assert.match(sql, /GRANT EXECUTE ON FUNCTION public\.csx_purge_company_operational_data\(uuid\) TO authenticated/)
    assert.doesNotMatch(sql, /GRANT EXECUTE ON FUNCTION public\.assert_csx_primary_soil_company/)
    assert.doesNotMatch(sql, /SERVICE_ROLE_KEY|service role client/)

    const purgeStart = sql.indexOf('FUNCTION public.csx_purge_company_operational_data')
    const purgeBody = sql.slice(purgeStart)
    const guardCall = purgeBody.indexOf('assert_csx_primary_soil_company')
    const countsCall = purgeBody.indexOf('csx_company_operational_counts')
    const firstDelete = purgeBody.indexOf('DELETE FROM')
    assert.ok(guardCall >= 0 && guardCall < countsCall && countsCall < firstDelete)
  })

  it('exige CSX en las rutas y confirma el nombre antes del purge', () => {
    for (const route of [countsRoute, purgeRoute]) {
      const csxCheck = route.indexOf('requireCsx')
      const rpcCall = route.indexOf('.rpc(')
      assert.ok(csxCheck >= 0)
      assert.ok(rpcCall > csxCheck)
    }
    assert.match(countsRoute, /csx_company_operational_counts/)
    assert.match(purgeRoute, /csx_purge_company_operational_data/)
    assert.match(purgeRoute, /executePurgeCompanyOperationalData/)
    assert.match(purgeRoute, /SOIL_IMPORTS_BUCKET/)
    assert.doesNotMatch(purgeRoute, /\.from\('samples'\)|\.from\('results'\)|\.from\('reports'\)/)
    assert.match(page, /verticalKey === 'suelo'/)
    assert.match(page, /Selecciona un laboratorio/)
    assert.match(page, /confirmName/)
  })
})
