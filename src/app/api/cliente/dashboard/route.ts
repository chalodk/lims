import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { ANALYSIS_TYPE_REGISTRY, getAnalysisTypeFromTestArea } from '@/config/analysisTypes'

type LinkedClientRow = { client_id: string }
type SampleRow = { id: string; code: string | null; received_date: string | null; received_at: string | null }
type ReportRow = { id: string }
type ResultRow = { id: string; sample_id: string; test_area: string | null; report_id: string | null }
type FindingRow = {
  id: string
  result_id: string
  sample_id: string
  test_area: string | null
  pathogen_name: string
  quantity: string | null
  detection_result: string | null
  is_sag_zero_tolerance: boolean
  created_at: string
}

function calendarYearBounds(reference = new Date()): { fromDate: string; toDate: string } {
  const year = reference.getFullYear()
  return {
    fromDate: `${year}-01-01`,
    toDate: `${year}-12-31`,
  }
}

function disciplineLabel(testArea: string | null): { typeKey: string; label: string } {
  const analysisType = getAnalysisTypeFromTestArea(testArea)
  if (analysisType === 'default') {
    return {
      typeKey: testArea?.trim() || '__uncategorized__',
      label: testArea?.trim() || 'Sin categoría',
    }
  }
  const entry = ANALYSIS_TYPE_REGISTRY[analysisType]
  return { typeKey: analysisType, label: entry.label }
}

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const { searchParams } = new URL(request.url)
    const clientId = searchParams.get('client_id')
    if (!clientId) {
      return NextResponse.json({ error: 'client_id is required' }, { status: 400 })
    }

    const { data: userRow, error: userError } = await supabase
      .from('users')
      .select('id, role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !userRow) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const roleData = userRow.roles as { name?: string } | { name?: string }[] | null
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name
    if (roleName !== 'consumidor') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const { data: links, error: linksError } = await supabase
      .from('user_clients')
      .select('client_id')
      .eq('user_id', user.id)

    if (linksError) {
      return NextResponse.json({ error: linksError.message }, { status: 500 })
    }

    const linkedClientIds = ((links || []) as LinkedClientRow[]).map((row) => row.client_id)
    if (!linkedClientIds.includes(clientId)) {
      return NextResponse.json({ error: 'Unauthorized access to client' }, { status: 403 })
    }

    const defaults = calendarYearBounds()
    const fromDate = searchParams.get('from') || defaults.fromDate
    const toDate = searchParams.get('to') || defaults.toDate
    const fromIso = new Date(`${fromDate}T00:00:00.000`).toISOString()
    const toIso = new Date(`${toDate}T23:59:59.999`).toISOString()

    const [samplesRes, reportsRes] = await Promise.all([
      supabase
        .from('samples')
        .select('id, code, received_date, received_at')
        .eq('client_id', clientId),
      supabase
        .from('reports')
        .select('id')
        .eq('client_id', clientId)
        .eq('completed', true)
        .gte('created_at', fromIso)
        .lte('created_at', toIso),
    ])

    if (samplesRes.error) {
      return NextResponse.json({ error: samplesRes.error.message }, { status: 500 })
    }
    if (reportsRes.error) {
      return NextResponse.json({ error: reportsRes.error.message }, { status: 500 })
    }

    const fromMs = new Date(`${fromDate}T00:00:00.000`).getTime()
    const toMs = new Date(`${toDate}T23:59:59.999`).getTime()
    const samples = ((samplesRes.data || []) as SampleRow[]).filter((sample) => {
      const rawDate = sample.received_at || sample.received_date
      if (!rawDate) return false
      const timestamp = new Date(rawDate).getTime()
      return Number.isFinite(timestamp) && timestamp >= fromMs && timestamp <= toMs
    })
    const reports = (reportsRes.data || []) as ReportRow[]
    const sampleIds = samples.map((sample) => sample.id)

    let results: ResultRow[] = []
    if (sampleIds.length > 0) {
      const { data: resultsData, error: resultsError } = await supabase
        .from('results')
        .select('id, sample_id, test_area, report_id')
        .in('sample_id', sampleIds)

      if (resultsError) {
        return NextResponse.json({ error: resultsError.message }, { status: 500 })
      }
      results = (resultsData || []) as ResultRow[]
    }
    const sampleCodeById = new Map(samples.map((sample) => [sample.id, sample.code || '—']))
    const reportIdByResultId = new Map(
      results.filter((result) => result.report_id).map((result) => [result.id, result.report_id as string])
    )

    let findings: FindingRow[] = []
    if (sampleIds.length > 0) {
      const { data: findingsData, error: findingsError } = await supabase
        .from('findings_normalized')
        .select(
          'id, result_id, sample_id, test_area, pathogen_name, quantity, detection_result, is_sag_zero_tolerance, created_at'
        )
        .in('sample_id', sampleIds)
        .order('created_at', { ascending: false })
        .limit(500)

      if (findingsError) {
        return NextResponse.json({ error: findingsError.message }, { status: 500 })
      }
      findings = (findingsData || []) as FindingRow[]
    }

    const samplesReceived = samples.length
    const reportsIssued = reports.length
    const analysisCoverageRatio =
      samplesReceived > 0 ? Number((results.length / samplesReceived).toFixed(2)) : 0

    const critico = findings.filter((row) => row.is_sag_zero_tolerance).length
    const controlado = findings.length - critico
    const criticalRate =
      findings.length > 0 ? Number(((critico / findings.length) * 100).toFixed(1)) : 0

    const disciplineMap = new Map<string, { typeKey: string; label: string; count: number }>()
    for (const result of results) {
      const { typeKey, label } = disciplineLabel(result.test_area)
      const current = disciplineMap.get(typeKey) || { typeKey, label, count: 0 }
      current.count += 1
      disciplineMap.set(typeKey, current)
    }
    // Prefer findings test_area when results empty but findings exist
    if (disciplineMap.size === 0) {
      for (const finding of findings) {
        const { typeKey, label } = disciplineLabel(finding.test_area)
        const current = disciplineMap.get(typeKey) || { typeKey, label, count: 0 }
        current.count += 1
        disciplineMap.set(typeKey, current)
      }
    }
    const byDiscipline = Array.from(disciplineMap.values()).sort((a, b) => b.count - a.count)

    const pathogenMap = new Map<string, number>()
    for (const finding of findings) {
      const name = finding.pathogen_name.trim()
      if (!name) continue
      pathogenMap.set(name, (pathogenMap.get(name) || 0) + 1)
    }
    const pathogenTotal = Array.from(pathogenMap.values()).reduce((sum, count) => sum + count, 0)
    const prevalence = Array.from(pathogenMap.entries())
      .map(([pathogenName, count]) => ({
        pathogenName,
        count,
        pct: pathogenTotal > 0 ? Number(((count / pathogenTotal) * 100).toFixed(1)) : 0,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10)

    const detections = findings.slice(0, 50).map((finding) => ({
      id: finding.id,
      sampleId: finding.sample_id,
      sampleCode: sampleCodeById.get(finding.sample_id) || '—',
      pathogenName: finding.pathogen_name,
      quantity: finding.quantity,
      testArea: finding.test_area,
      testAreaLabel: disciplineLabel(finding.test_area).label,
      isSagZeroTolerance: finding.is_sag_zero_tolerance,
      detectionResult: finding.detection_result,
      resultId: finding.result_id,
      reportId: reportIdByResultId.get(finding.result_id) || null,
      createdAt: finding.created_at,
    }))

    return NextResponse.json({
      period: { from: fromDate, to: toDate },
      kpis: {
        samplesReceived,
        reportsIssued,
        analysisCoverageRatio,
        criticalRate,
      },
      byDiscipline,
      prevalence,
      semaforo: {
        critico,
        controlado,
        hasNormalizedFindings: findings.length > 0,
      },
      detections,
    })
  } catch (error) {
    console.error('Error in /api/cliente/dashboard:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
})
