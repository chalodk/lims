import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { id: reportId } = await params

    if (!reportId) {
      return NextResponse.json({ error: 'Report ID is required' }, { status: 400 })
    }

    // First check if report exists and get its data
    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, status')
      .eq('id', reportId)
      .single()

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Prevent deletion of sent reports
    if (report.status === 'sent') {
      return NextResponse.json(
        { error: 'Cannot delete sent reports' }, 
        { status: 400 }
      )
    }

    // Update associated results to remove report_id reference
    const { error: updateResultsError } = await supabase
      .from('results')
      .update({ report_id: null })
      .eq('report_id', reportId)

    if (updateResultsError) {
      console.error('Error updating results:', updateResultsError)
      return NextResponse.json(
        { error: 'Failed to update associated results' },
        { status: 500 }
      )
    }

    // Delete the report
    const { error: deleteError } = await supabase
      .from('reports')
      .delete()
      .eq('id', reportId)

    if (deleteError) {
      console.error('Error deleting report:', deleteError)
      return NextResponse.json(
        { error: 'Failed to delete report' },
        { status: 500 }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error in DELETE /api/reports/delete/[id]:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}