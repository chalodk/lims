import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { payment, invoice_number } = await request.json()

    // Validate input
    if (typeof payment !== 'boolean') {
      return NextResponse.json({ error: 'Payment must be a boolean value' }, { status: 400 })
    }

    // Get user's company_id if available for security check
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Check if the report exists and user has access
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('id, company_id')
      .eq('id', reportId)
      .single()

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check company access (only if userData exists and has company_id)
    if (userData?.company_id && existingReport.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Update the payment information
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update({
        payment: payment,
        invoice_number: invoice_number || null,
        updated_at: new Date().toISOString()
      })
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error:', updateError)
      return NextResponse.json(
        { error: updateError.message || 'Failed to update payment information' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Payment information updated successfully',
      report: updatedReport
    })
  } catch (error) {
    console.error('Error updating payment information:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}