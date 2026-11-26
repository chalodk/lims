import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { SOIL_REPORT_ANALYSIS_TYPE } from '@/lib/soil/soilReportRecord'
import { requireSoilLab } from '@/lib/services/soilService'

const validationSchema = z.object({
  status: z.enum(['validated', 'draft']),
})

/** PATCH /api/soil/reports/:id/validation — completed, igual que los informes de fitosanidad. */
export const PATCH = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })
    if (access.roleName !== 'admin' && access.roleName !== 'validador') {
      return NextResponse.json(
        { error: 'Solo un administrador o un validador puede validar informes' },
        { status: 403 }
      )
    }

    const parsedBody = validationSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json({ error: 'Estado inválido' }, { status: 400 })
    }

    const { id: reportId } = await (params as Promise<{ id: string }>)
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('id, completed, analysis_type')
      .eq('id', reportId)
      .eq('company_id', access.companyId)
      .eq('analysis_type', SOIL_REPORT_ANALYSIS_TYPE)
      .maybeSingle()
    if (fetchError) throw new Error(fetchError.message)
    if (!existingReport) return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })

    const requestedStatus = parsedBody.data.status
    const isCurrentlyValidated = existingReport.completed === true
    if (!isCurrentlyValidated && requestedStatus !== 'validated') {
      return NextResponse.json({ error: 'Solo se puede validar un borrador' }, { status: 400 })
    }
    if (isCurrentlyValidated && requestedStatus !== 'draft') {
      return NextResponse.json({ error: 'Solo se puede quitar la validación de un informe validado' }, { status: 400 })
    }

    const completed = requestedStatus === 'validated'
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        completed,
        responsible_id: completed ? user.id : null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', reportId)
      .select('id, completed')
      .single()
    if (updateError || !updatedReport) throw new Error(updateError?.message || 'No se pudo actualizar el informe')

    return NextResponse.json({
      report: { id: updatedReport.id, completed: updatedReport.completed === true },
    })
  } catch (error) {
    console.error('Error en PATCH /api/soil/reports/[id]/validation:', error)
    return NextResponse.json(
      {
        error: 'No se pudo actualizar la validación',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
