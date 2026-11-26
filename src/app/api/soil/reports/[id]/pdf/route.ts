import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { renderSoilReportPdf } from '@/lib/soil/renderSoilPdf'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'
import { SOIL_REPORT_ANALYSIS_TYPE, storedSoilPdfUrls } from '@/lib/soil/soilReportRecord'
import { requireSoilLab } from '@/lib/services/soilService'

export const maxDuration = 60

type StoredSoilReport = {
  id: string
  created_at: string
  payload: SoilReportPayload
  source: 'reports' | 'soil_reports'
}

/** POST /api/soil/reports/:id/pdf — plantilla de suelo. Si la fila está en reports, guarda las URL. */
export const POST = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { id: reportId } = await (params as Promise<{ id: string }>)
    const { data: storedRow, error: storedError } = await supabase
      .from('reports')
      .select('id, created_at, payload')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .eq('analysis_type', SOIL_REPORT_ANALYSIS_TYPE)
      .maybeSingle()
    if (storedError) throw new Error(storedError.message)

    let report: StoredSoilReport | null = null
    if (storedRow?.payload) {
      report = {
        id: storedRow.id,
        created_at: storedRow.created_at,
        payload: storedRow.payload as unknown as SoilReportPayload,
        source: 'reports',
      }
    } else {
      const { data: legacyRow, error: legacyError } = await supabase
        .from('soil_reports')
        .select('id, created_at, payload')
        .eq('id', reportId)
        .eq('company_id', access.companyId)
        .maybeSingle()
      if (legacyError) throw new Error(legacyError.message)
      if (legacyRow?.payload) {
        report = {
          id: legacyRow.id,
          created_at: legacyRow.created_at,
          payload: legacyRow.payload as unknown as SoilReportPayload,
          source: 'soil_reports',
        }
      }
    }
    if (!report) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', access.companyId)
      .maybeSingle()
    if (companyError) throw new Error(companyError.message)

    const generatedUrl = await renderSoilReportPdf({
      reportId: report.id,
      payload: report.payload,
      laboratoryName: company?.name || 'Laboratorio',
      logoUrl: company?.logo_url,
      createdAt: report.created_at,
    })
    const storedUrls = storedSoilPdfUrls(generatedUrl)
    if (!storedUrls) {
      return NextResponse.json({ error: 'El PDF no tiene un enlace seguro' }, { status: 502 })
    }

    if (report.source === 'reports') {
      const { error: updateError } = await supabase
        .from('reports')
        .update({
          rendered_pdf_url: storedUrls.renderedPdfUrl,
          download_url: storedUrls.downloadUrl,
          updated_at: new Date().toISOString(),
        })
        .eq('id', report.id)
      if (updateError) throw new Error(updateError.message)
    }

    return NextResponse.json({
      downloadUrl: storedUrls.downloadUrl,
      renderedPdfUrl: storedUrls.renderedPdfUrl,
    })
  } catch (error) {
    console.error('Error en POST /api/soil/reports/[id]/pdf:', error)
    return NextResponse.json(
      {
        error: 'No se pudo generar el PDF del informe',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 502 }
    )
  }
})
