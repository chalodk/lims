import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const DELETE = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const { id: reportId } = await (params as Promise<{ id: string }>)

    if (!reportId) {
      return NextResponse.json({ error: 'ID de reporte requerido' }, { status: 400 })
    }

    // Verify report exists and belongs to user's company
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, status, company_id')
      .eq('id', reportId)
      .eq('company_id', companyId)
      .single()

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Reporte no encontrado' }, { status: 404 })
    }

    if (report.status === 'sent') {
      return NextResponse.json(
        { error: 'No se pueden eliminar reportes enviados' },
        { status: 400 }
      )
    }

    const { error: updateResultsError } = await supabase
      .from('results')
      .update({ report_id: null })
      .eq('report_id', reportId)

    if (updateResultsError) {
      console.error('Error updating results:', updateResultsError)
      return NextResponse.json(
        { error: 'Error al actualizar los resultados asociados' },
        { status: 500 }
      )
    }

    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)
      .eq('company_id', companyId)

    if (deleteError) {
      console.error('Error deleting report:', deleteError)
      return NextResponse.json(
        { error: 'Error al eliminar el reporte' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reports/delete/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
