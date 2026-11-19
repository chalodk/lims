import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireSoilLab } from '@/lib/services/soilService'
import type { SoilReportPayload } from '@/lib/soil/reportPayload'

type SoilReportDetailRow = {
  id: string
  created_at: string
  payload: SoilReportPayload
  soil_matrices: { name: string } | { name: string }[] | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** GET /api/soil/reports/:id — informe guardado, con el payload congelado. */
export const GET = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { id: reportId } = await (params as Promise<{ id: string }>)
    const { data, error } = await supabase
      .from('soil_reports')
      .select('id, created_at, payload, soil_matrices(name)')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (error) throw new Error(error.message)
    if (!data) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const report = data as unknown as SoilReportDetailRow
    return NextResponse.json({
      report: {
        id: report.id,
        createdAt: report.created_at,
        matrixName: firstOf(report.soil_matrices)?.name ?? report.payload.matrixName,
        payload: report.payload,
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
