import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'
import { consumerCanSeeSoilReport, SOIL_REPORT_ANALYSIS_TYPE } from '@/lib/soil/soilReportRecord'
import { loadLinkedClientIds, requireSoilReportAccess } from '@/lib/services/soilService'

type StoredReportDetail = {
  id: string
  created_at: string
  completed: boolean | null
  client_id: string | null
  test_areas: string[] | null
  payload: SoilReportPayload | null
  rendered_pdf_url: string | null
  download_url: string | null
}

type LegacyReportDetail = {
  id: string
  created_at: string
  payload: SoilReportPayload
  soil_matrices: { name: string } | { name: string }[] | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function storedDetail(report: StoredReportDetail) {
  return {
    id: report.id,
    createdAt: report.created_at,
    matrixName: report.payload?.matrixName ?? report.test_areas?.[0] ?? 'Informe',
    payload: report.payload,
    source: 'reports' as const,
    completed: report.completed === true,
    clientId: report.client_id,
    renderedPdfUrl: report.rendered_pdf_url,
    downloadUrl: report.download_url,
  }
}

/** GET /api/soil/reports/:id — informe nuevo en reports, o uno viejo de soil_reports. */
export const GET = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilReportAccess(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { id: reportId } = await (params as Promise<{ id: string }>)
    const isConsumer = access.roleName === 'consumidor'
    const { data: storedRow, error: storedError } = await supabase
      .from('reports')
      .select('id, created_at, completed, client_id, test_areas, payload, rendered_pdf_url, download_url')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .eq('analysis_type', SOIL_REPORT_ANALYSIS_TYPE)
      .maybeSingle()
    if (storedError) throw new Error(storedError.message)

    if (storedRow) {
      const report = storedDetail(storedRow as unknown as StoredReportDetail)
      if (isConsumer) {
        const linkedClientIds = await loadLinkedClientIds(supabase, user.id)
        if (!consumerCanSeeSoilReport(report, linkedClientIds) || !report.payload) {
          return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
        }
      }
      if (!report.payload) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
      return NextResponse.json({ report })
    }

    if (isConsumer) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const { data, error } = await supabase
      .from('soil_reports')
      .select('id, created_at, payload, soil_matrices(name)')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const legacy = data as unknown as LegacyReportDetail
    return NextResponse.json({
      report: {
        id: legacy.id,
        createdAt: legacy.created_at,
        matrixName: firstOf(legacy.soil_matrices)?.name ?? legacy.payload.matrixName,
        payload: legacy.payload,
        source: 'soil_reports',
        completed: false,
        clientId: null,
        renderedPdfUrl: null,
        downloadUrl: null,
      },
    })
  } catch (error) {
    console.error('Error en GET /api/soil/reports/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener el informe de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
