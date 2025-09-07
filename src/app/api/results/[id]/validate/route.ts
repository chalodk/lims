import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: resultId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // For now, allow all authenticated users to validate
    // Get user's company_id if available
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Get the current result to check access and status
    const { data: currentResult, error: fetchError } = await supabase
      .from('results')
      .select(`
        *,
        samples!inner (company_id)
      `)
      .eq('id', resultId)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    // Check company access (only if userData exists and has company_id)
    if (userData?.company_id && currentResult.samples?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Check if result is already validated
    if (currentResult.status === 'validated') {
      return NextResponse.json({ error: 'Result is already validated' }, { status: 400 })
    }

    // Update result to validated status
    const { data, error } = await supabase
      .from('results')
      .update({
        status: 'validated',
        validated_by: user.id,
        validation_date: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .eq('id', resultId)
      .select(`
        *,
        sample_tests (
          id,
          test_catalog (id, name, area, code),
          methods (id, name, code)
        ),
        samples (
          id,
          code,
          species,
          variety,
          received_date,
          company_id,
          clients (id, name, contact_email),
          projects (id, name)
        ),
        performed_by_user:users!performed_by (id, name, email),
        validated_by_user:users!validated_by (id, name, email)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error validating result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}