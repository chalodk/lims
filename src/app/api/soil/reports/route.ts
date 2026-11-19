import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { buildSoilReportPayload } from '@/lib/soil/reportPayload'
import { loadSoilReportSources, requireSoilLab } from '@/lib/services/soilService'

const createSoilReportSchema = z.object({
  matrix_id: z.string().uuid(),
  sample_ids: z.array(z.string().uuid()).min(1, 'Selecciona al menos una muestra'),
})

type SoilReportListRow = {
  id: string
  created_at: string
  soil_matrices: { name: string } | { name: string }[] | null
  soil_report_samples: { count: number }[] | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** GET /api/soil/reports — informes de suelo ya creados. */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await supabase
      .from('soil_reports')
      .select('id, created_at, soil_matrices(name), soil_report_samples(count)')
      .eq('company_id', access.companyId)
      .order('created_at', { ascending: false })
      .limit(200)
    if (error) throw new Error(error.message)

    const reports = ((data || []) as unknown as SoilReportListRow[]).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      matrixName: firstOf(row.soil_matrices)?.name ?? null,
      sampleCount: row.soil_report_samples?.[0]?.count ?? 0,
    }))

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

/** POST /api/soil/reports — arma el payload en el servidor y guarda el informe. */
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
    const unknownCount = sampleIds.length - selectedSamples.length
    if (unknownCount > 0 || omittedCodes.length > 0) {
      return NextResponse.json(
        {
          error:
            omittedCodes.length > 0
              ? `Estas muestras no tienen resultados de ${matrix.name}: ${omittedCodes.join(', ')}`
              : 'Alguna muestra no pertenece a tu laboratorio',
        },
        { status: 400 }
      )
    }

    const { data: createdReport, error: reportError } = await supabase
      .from('soil_reports')
      .insert({
        company_id: access.companyId,
        matrix_id: matrix.id,
        payload,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (reportError || !createdReport) throw new Error(reportError?.message || 'No se pudo crear el informe')

    const { error: linkError } = await supabase.from('soil_report_samples').insert(
      payload.samples.map((sample) => ({ report_id: createdReport.id, sample_id: sample.id }))
    )
    if (linkError) {
      await supabase.from('soil_reports').delete().eq('id', createdReport.id)
      throw new Error(linkError.message)
    }

    return NextResponse.json({ report: { id: createdReport.id } }, { status: 201 })
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
