import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import {
  buildDisciplineDashboard,
  parseDisciplineQuery,
  type DisciplineFindingInput,
  type DisciplineResultInput,
  type DisciplineSampleInput,
} from '@/lib/stats/disciplineDashboard'

type SampleSlice = {
  id?: string
  received_at: string | null
  received_date: string | null
}

type ResultQueryRow = {
  id: string
  sample_id: string
  test_area: string | null
  samples: SampleSlice | SampleSlice[] | null
}

type FindingQueryRow = {
  result_id: string
  sample_id: string
  test_area: string | null
  findings_type: string | null
  pathogen_name: string | null
  detection_result: string | null
}

function unwrapSample(samples: SampleSlice | SampleSlice[] | null): SampleSlice | null {
  if (!samples) return null
  return Array.isArray(samples) ? samples[0] ?? null : samples
}

function roleNameFromRow(roles: { name?: string } | { name?: string }[] | null): string | undefined {
  if (!roles) return undefined
  return Array.isArray(roles) ? roles[0]?.name : roles.name
}

async function fetchAllPages<T>(
  fetchRange: (
    fromInclusive: number,
    toInclusive: number
  ) => Promise<{ data: T[] | null; error: { message: string } | null }>
): Promise<T[]> {
  const pageSize = 1000
  let fromInclusive = 0
  const accumulated: T[] = []
  while (true) {
    const toInclusive = fromInclusive + pageSize - 1
    const { data, error } = await fetchRange(fromInclusive, toInclusive)
    if (error) throw error
    const chunk = data ?? []
    accumulated.push(...chunk)
    if (chunk.length < pageSize) break
    fromInclusive += pageSize
  }
  return accumulated
}

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const parsed = parseDisciplineQuery({
      area: searchParams.get('area'),
      months: searchParams.get('months'),
    })
    if (!parsed.ok) {
      return NextResponse.json({ error: parsed.error }, { status: parsed.status })
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('company_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !userData) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const roleName = roleNameFromRow(userData.roles as { name?: string } | { name?: string }[] | null)
    if (roleName !== 'admin' && roleName !== 'validador') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const companyId = userData.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin compañía asignada' }, { status: 400 })
    }

    const [resultRows, findingRows] = await Promise.all([
      fetchAllPages<ResultQueryRow>(async (fromInclusive, toInclusive) => {
        return supabase
          .from('results')
          .select('id, sample_id, test_area, samples!inner(id, received_at, received_date, company_id)')
          .eq('samples.company_id', companyId)
          .range(fromInclusive, toInclusive)
      }),
      fetchAllPages<FindingQueryRow>(async (fromInclusive, toInclusive) => {
        return supabase
          .from('findings_normalized')
          .select(
            'result_id, sample_id, test_area, findings_type, pathogen_name, detection_result, samples!inner(company_id)'
          )
          .eq('samples.company_id', companyId)
          .range(fromInclusive, toInclusive)
      }),
    ])

    const samples: DisciplineSampleInput[] = []
    const seenSampleIds = new Set<string>()
    const results: DisciplineResultInput[] = resultRows.map((row) => {
      const sample = unwrapSample(row.samples)
      if (sample && !seenSampleIds.has(row.sample_id)) {
        seenSampleIds.add(row.sample_id)
        samples.push({
          id: row.sample_id,
          receivedAt: sample.received_at,
          receivedDate: sample.received_date,
        })
      }
      return {
        id: row.id,
        sampleId: row.sample_id,
        testArea: row.test_area,
      }
    })

    const findings: DisciplineFindingInput[] = findingRows.map((row) => ({
      resultId: row.result_id,
      sampleId: row.sample_id,
      testArea: row.test_area,
      findingsType: row.findings_type,
      pathogenName: row.pathogen_name ?? '',
      detectionResult: row.detection_result,
    }))

    const dashboard = buildDisciplineDashboard({
      discipline: parsed.discipline,
      months: parsed.months,
      samples,
      results,
      findings,
    })

    return NextResponse.json(dashboard)
  } catch (error) {
    console.error('Error fetching discipline statistics:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
