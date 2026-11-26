import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireSoilLab } from '@/lib/services/soilService'
import { createSoilSampleSchema } from '@/lib/soil/sampleIntake'

type SoilAnalysisEmbed = {
  id: string
  report_title: string
  unit: string | null
  method_label: string | null
  sort_order: number
}

type SoilSampleDetailRow = {
  id: string
  code: string
  status: string
  received_at: string
  sampled_at: string
  sampled_by: string
  notes: string | null
  clients: { id: string; name: string } | { id: string; name: string }[] | null
  soil_subsamples:
    | {
        id: string
        number: number
        soil_results:
          | {
              analysis_id: string
              value_numeric: number | null
              value_qualifier: string | null
              value_text: string | null
              raw_value: string | null
              unit: string | null
              basis: string | null
              soil_analyses: SoilAnalysisEmbed | SoilAnalysisEmbed[] | null
            }[]
          | null
      }[]
    | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** GET /api/soil/samples/:id — muestra y los resultados que ya tiene, con la matriz de cada uno. */
export const GET = withAuth(
  async (_request: NextRequest, { user, supabase, params }) => {
    try {
      const access = await requireSoilLab(supabase, user.id)
      if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

      const { id: sampleId } = await (params as Promise<{ id: string }>)
      const { data, error } = await supabase
        .from('soil_samples')
        .select(
          'id, code, status, received_at, sampled_at, sampled_by, notes, clients(id, name), soil_subsamples(id, number, soil_results(analysis_id, value_numeric, value_qualifier, value_text, raw_value, unit, basis, soil_analyses(id, report_title, unit, method_label, sort_order)))'
        )
        .eq('id', sampleId)
        .eq('company_id', access.companyId)
        .maybeSingle()
      if (error) throw new Error(error.message)
      if (!data) return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })

      const sample = data as unknown as SoilSampleDetailRow
      const analysisById = new Map<string, SoilAnalysisEmbed>()
      const subsamples = (sample.soil_subsamples || [])
        .sort((first, second) => first.number - second.number)
        .map((subsample) => ({
          id: subsample.id,
          number: subsample.number,
          results: (subsample.soil_results || []).map((result) => {
            const analysis = firstOf(result.soil_analyses)
            if (analysis) analysisById.set(analysis.id, analysis)
            return {
              analysisId: result.analysis_id,
              valueNumeric: result.value_numeric,
              valueQualifier: result.value_qualifier,
              valueText: result.value_text,
              rawValue: result.raw_value,
              unit: result.unit,
              basis: result.basis,
            }
          }),
        }))

      const analyses = [...analysisById.values()]
        .sort((first, second) => first.sort_order - second.sort_order)
        .map((analysis) => ({
          id: analysis.id,
          reportTitle: analysis.method_label
            ? `${analysis.report_title} (${analysis.method_label})`
            : analysis.report_title,
          unit: analysis.unit,
        }))

      return NextResponse.json({
        sample: {
          id: sample.id,
          code: sample.code,
          status: sample.status,
          receivedAt: sample.received_at,
          sampledAt: sample.sampled_at,
          sampledBy: sample.sampled_by,
          notes: sample.notes,
          clientId: firstOf(sample.clients)?.id ?? null,
          clientName: firstOf(sample.clients)?.name ?? null,
        },
        analyses,
        subsamples,
      })
    } catch (error) {
      console.error('Error en GET /api/soil/samples/[id]:', error)
      return NextResponse.json(
        {
          error: 'Error al obtener la muestra de suelo',
          details: error instanceof Error ? error.message : 'Error desconocido',
        },
        { status: 500 }
      )
    }
  }
)

/** PATCH /api/soil/samples/:id — metadatos de la muestra. Solo Admin. */
export const PATCH = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.roleName !== 'admin') {
      return NextResponse.json({ error: 'Solo un administrador puede editar la muestra' }, { status: 403 })
    }

    const parsedBody = createSoilSampleSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }
    const sampleInput = parsedBody.data
    const { id: sampleId } = await (params as Promise<{ id: string }>)

    const { data: existingSample, error: existingError } = await supabase
      .from('soil_samples')
      .select('id')
      .eq('id', sampleId)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (existingError) throw new Error(existingError.message)
    if (!existingSample) return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })

    const { data: client, error: clientError } = await supabase
      .from('clients')
      .select('id')
      .eq('id', sampleInput.client_id)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (clientError) throw new Error(clientError.message)
    if (!client) {
      return NextResponse.json({ error: 'El cliente no pertenece a tu laboratorio' }, { status: 400 })
    }

    const { data: updatedSample, error: updateError } = await supabase
      .from('soil_samples')
      .update({
        client_id: sampleInput.client_id,
        code: sampleInput.code,
        received_at: sampleInput.received_at,
        sampled_at: sampleInput.sampled_at,
        sampled_by: sampleInput.sampled_by,
        notes: sampleInput.notes || null,
      })
      .eq('id', sampleId)
      .eq('company_id', access.companyId)
      .select('id, code')
      .single()

    if (updateError || !updatedSample) {
      if (updateError?.code === '23505') {
        return NextResponse.json(
          { error: `Ya existe una muestra con el código ${sampleInput.code}` },
          { status: 409 }
        )
      }
      throw new Error(updateError?.message || 'No se pudo actualizar la muestra')
    }

    return NextResponse.json({ sample: updatedSample })
  } catch (error) {
    console.error('Error en PATCH /api/soil/samples/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error al actualizar la muestra de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
