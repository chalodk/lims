import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireSoilLab } from '@/lib/services/soilService'

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
  notes: string | null
  clients: { name: string } | { name: string }[] | null
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
          'id, code, status, received_at, notes, clients(name), soil_subsamples(id, number, soil_results(analysis_id, value_numeric, value_qualifier, value_text, raw_value, unit, basis, soil_analyses(id, report_title, unit, method_label, sort_order)))'
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
          notes: sample.notes,
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
