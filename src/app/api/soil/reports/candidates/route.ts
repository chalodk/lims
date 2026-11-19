import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { buildSoilReportPayload, type SoilReportPayload } from '@/lib/soil/reportPayload'
import { loadSoilReportSources, requireSoilLab } from '@/lib/services/soilService'

/**
 * GET /api/soil/reports/candidates?matrix_id=&sample_id=
 * Muestras con algún resultado cuyo análisis aplica a la matriz.
 * Si vienen sample_id, también devuelve el payload de esas muestras.
 */
export const GET = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const matrixId = request.nextUrl.searchParams.get('matrix_id')
    if (!matrixId || !/^[0-9a-f-]{36}$/i.test(matrixId)) {
      return NextResponse.json({ error: 'Elige una matriz' }, { status: 400 })
    }

    const { data: matrix, error: matrixError } = await supabase
      .from('soil_matrices')
      .select('id, name')
      .eq('id', matrixId)
      .maybeSingle()
    if (matrixError) throw new Error(matrixError.message)
    if (!matrix) return NextResponse.json({ error: 'Matriz no encontrada' }, { status: 404 })

    const sources = await loadSoilReportSources(supabase, access.companyId)
    const catalogPayload = buildSoilReportPayload({
      matrixId: matrix.id,
      matrixName: matrix.name,
      analyses: sources.analyses,
      samples: sources.samples,
    })
    const statusBySampleId = new Map(sources.samples.map((sample) => [sample.id, sample.status]))
    const samples = catalogPayload.samples.map((sample) => ({
      id: sample.id,
      code: sample.code,
      clientName: sample.clientName,
      receivedAt: sample.receivedAt,
      status: statusBySampleId.get(sample.id) ?? 'received',
      matchingResultCount: sample.subsamples.reduce((total, subsample) => total + subsample.results.length, 0),
    }))

    const requestedSampleIds = request.nextUrl.searchParams.getAll('sample_id').filter(Boolean)
    let payload: SoilReportPayload | null = null
    let omittedSampleCodes: string[] = []
    if (requestedSampleIds.length > 0) {
      const requested = new Set(requestedSampleIds)
      const selectedSamples = sources.samples.filter((sample) => requested.has(sample.id))
      payload = buildSoilReportPayload({
        matrixId: matrix.id,
        matrixName: matrix.name,
        analyses: sources.analyses,
        samples: selectedSamples,
      })
      const includedIds = new Set(payload.samples.map((sample) => sample.id))
      omittedSampleCodes = selectedSamples.filter((sample) => !includedIds.has(sample.id)).map((sample) => sample.code)
    }

    return NextResponse.json({
      matrix: { id: matrix.id, name: matrix.name },
      samples,
      payload,
      omittedSampleCodes,
    })
  } catch (error) {
    console.error('Error en GET /api/soil/reports/candidates:', error)
    return NextResponse.json(
      {
        error: 'Error al preparar el informe de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
