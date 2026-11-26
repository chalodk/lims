import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { buildSoilReportPayload, type SoilReportPayload } from '@/lib/soil/reportPayload'
import { renderSoilReportPdf } from '@/lib/soil/renderSoilPdf'
import {
  consumerCanSeeSoilReport,
  singleSoilReportClientId,
  SOIL_REPORT_ANALYSIS_TYPE,
  storedSoilPdfUrls,
} from '@/lib/soil/soilReportRecord'
import { loadLinkedClientIds, loadSoilReportSources, requireSoilLab, requireSoilReportAccess } from '@/lib/services/soilService'
import { codesForSampleIds, sampleIdsFromReportPayload } from '@/lib/soil/reportSampleCodes'

export const maxDuration = 60

const createSoilReportSchema = z.object({
  matrix_id: z.string().uuid(),
  sample_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos una muestra'),
})

type LegacySoilReportListRow = {
  id: string
  created_at: string
  soil_matrices: { name: string } | { name: string }[] | null
  soil_report_samples:
    | {
        sample_id: string
        soil_samples: { code: string } | { code: string }[] | null
      }[]
    | null
}

type StoredSoilReportRow = {
  id: string
  created_at: string
  completed: boolean | null
  client_id: string | null
  test_areas: string[] | null
  payload: SoilReportPayload | null
  rendered_pdf_url: string | null
  download_url: string | null
}

export interface SoilInformeListItem {
  id: string
  createdAt: string
  matrixName: string | null
  sampleCount: number
  sampleCodes: string[]
  source: 'reports' | 'soil_reports'
  completed: boolean
  clientId: string | null
  renderedPdfUrl: string | null
  downloadUrl: string | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

function reportListItem(row: StoredSoilReportRow, sampleCodes: string[]): SoilInformeListItem {
  const payload = row.payload
  return {
    id: row.id,
    createdAt: row.created_at,
    matrixName: payload?.matrixName ?? row.test_areas?.[0] ?? null,
    sampleCount: sampleCodes.length,
    sampleCodes,
    source: 'reports',
    completed: row.completed === true,
    clientId: row.client_id,
    renderedPdfUrl: row.rendered_pdf_url,
    downloadUrl: row.download_url,
  }
}

function legacySampleCodes(row: LegacySoilReportListRow): string[] {
  const links = row.soil_report_samples || []
  const codeBySampleId = new Map<string, string>()
  for (const link of links) {
    const sampleCode = firstOf(link.soil_samples)?.code
    if (sampleCode) codeBySampleId.set(link.sample_id, sampleCode)
  }
  return codesForSampleIds(
    links.map((link) => link.sample_id),
    codeBySampleId
  )
}

/** GET /api/soil/reports — informes nuevos en reports y, para el laboratorio, los viejos. */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilReportAccess(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const isConsumer = access.roleName === 'consumidor'
    const linkedClientIds = isConsumer ? await loadLinkedClientIds(supabase, user.id) : []

    let reportsQuery = supabase
      .from('reports')
      .select('id, created_at, completed, client_id, test_areas, payload, rendered_pdf_url, download_url')
      .eq('company_id', access.companyId)
      .eq('analysis_type', SOIL_REPORT_ANALYSIS_TYPE)
      .order('created_at', { ascending: false })
      .limit(200)

    if (isConsumer) {
      if (linkedClientIds.length === 0) {
        return NextResponse.json({ reports: [] })
      }
      reportsQuery = reportsQuery.eq('completed', true).in('client_id', linkedClientIds)
    }

    const { data: reportRows, error: reportsError } = await reportsQuery
    if (reportsError) throw new Error(reportsError.message)

    const storedRows = (reportRows || []) as unknown as StoredSoilReportRow[]
    const sampleIds = [...new Set(storedRows.flatMap((row) => sampleIdsFromReportPayload(row.payload)))]
    const codeBySampleId = new Map<string, string>()
    if (sampleIds.length > 0) {
      const { data: sampleRows, error: sampleCodesError } = await supabase
        .from('soil_samples')
        .select('id, code')
        .eq('company_id', access.companyId)
        .in('id', sampleIds)
      if (sampleCodesError) throw new Error(sampleCodesError.message)
      for (const sampleRow of sampleRows || []) {
        codeBySampleId.set(sampleRow.id, sampleRow.code)
      }
    }

    const storedReports = storedRows
      .map((row) =>
        reportListItem(row, codesForSampleIds(sampleIdsFromReportPayload(row.payload), codeBySampleId))
      )
      .filter((report) => !isConsumer || consumerCanSeeSoilReport(report, linkedClientIds))

    if (isConsumer) {
      return NextResponse.json({ reports: storedReports })
    }

    const { data: legacyRows, error: legacyError } = await supabase
      .from('soil_reports')
      .select('id, created_at, soil_matrices(name), soil_report_samples(sample_id, soil_samples(code))')
      .eq('company_id', access.companyId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (legacyError) throw new Error(legacyError.message)

    const legacyReports: SoilInformeListItem[] = ((legacyRows || []) as unknown as LegacySoilReportListRow[]).map(
      (row) => {
        const sampleCodes = legacySampleCodes(row)
        return {
          id: row.id,
          createdAt: row.created_at,
          matrixName: firstOf(row.soil_matrices)?.name ?? null,
          sampleCount: sampleCodes.length,
          sampleCodes,
          source: 'soil_reports',
          completed: false,
          clientId: null,
          renderedPdfUrl: null,
          downloadUrl: null,
        }
      }
    )

    const reports = [...storedReports, ...legacyReports].sort((left, right) =>
      right.createdAt.localeCompare(left.createdAt)
    )
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Error en GET /api/soil/reports:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener informes de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})

/** POST /api/soil/reports — guarda el informe nuevo en reports, con un solo cliente. */
export const POST = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const parsedBody = createSoilReportSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }

    const matrixId = parsedBody.data.matrix_id
    const sampleIds = [...new Set(parsedBody.data.sample_ids)]
    const { data: matrix, error: matrixError } = await supabase
      .from('soil_matrices')
      .select('id, name')
      .eq('id', matrixId)
      .maybeSingle()
    if (matrixError) throw new Error(matrixError.message)
    if (!matrix) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })

    const sources = await loadSoilReportSources(supabase, access.companyId)
    const selectedSamples = sources.samples.filter((sample) => sampleIds.includes(sample.id))
    const unknownCount = sampleIds.length - selectedSamples.length
    if (unknownCount > 0) {
      return NextResponse.json({ error: 'Alguna muestra no pertenece a tu laboratorio' }, { status: 400 })
    }

    const clientDecision = singleSoilReportClientId(selectedSamples.map((sample) => sample.clientId))
    if (!clientDecision.ok) {
      return NextResponse.json({ error: clientDecision.error }, { status: 400 })
    }

    const payload = buildSoilReportPayload({
      matrixId: matrix.id,
      matrixName: matrix.name,
      analyses: sources.analyses,
      samples: selectedSamples,
    })
    const includedIds = new Set(payload.samples.map((sample) => sample.id))
    const omittedCodes = selectedSamples
      .filter((sample) => !includedIds.has(sample.id))
      .map((sample) => sample.code)
    if (omittedCodes.length > 0) {
      return NextResponse.json(
        { error: `Estas muestras no tienen resultados de ${matrix.name}: ${omittedCodes.join(', ')}` },
        { status: 400 }
      )
    }

    const { data: createdReport, error: reportError } = await supabase
      .from('reports')
      .insert({
        company_id: access.companyId,
        client_id: clientDecision.clientId,
        generated_by: user.id,
        status: 'draft',
        template: 'standard',
        completed: false,
        test_areas: [matrix.name],
        analysis_type: SOIL_REPORT_ANALYSIS_TYPE,
        include_recommendations: false,
        include_images: false,
        payload: payload as unknown as Record<string, unknown>,
      })
      .select('id, created_at')
      .single()
    if (reportError || !createdReport) throw new Error(reportError?.message || 'No se pudo crear el informe')

    let renderedPdfUrl: string | null = null
    let downloadUrl: string | null = null
    try {
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .select('name, logo_url')
        .eq('id', access.companyId)
        .maybeSingle()
      if (companyError) throw new Error(companyError.message)

      const generatedUrl = await renderSoilReportPdf({
        reportId: createdReport.id,
        payload,
        laboratoryName: company?.name || 'Laboratorio',
        logoUrl: company?.logo_url,
        createdAt: createdReport.created_at,
      })
      const storedUrls = storedSoilPdfUrls(generatedUrl)
      if (storedUrls) {
        const { error: urlError } = await supabase
          .from('reports')
          .update({
            rendered_pdf_url: storedUrls.renderedPdfUrl,
            download_url: storedUrls.downloadUrl,
            updated_at: new Date().toISOString(),
          })
          .eq('id', createdReport.id)
        if (urlError) throw new Error(urlError.message)
        renderedPdfUrl = storedUrls.renderedPdfUrl
        downloadUrl = storedUrls.downloadUrl
      }
    } catch (pdfError) {
      console.error('El informe quedó guardado, pero el PDF no:', pdfError)
    }

    return NextResponse.json(
      { report: { id: createdReport.id, renderedPdfUrl, downloadUrl } },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error en POST /api/soil/reports:', error)
    return NextResponse.json(
      {
        error: 'Error al crear el informe de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
