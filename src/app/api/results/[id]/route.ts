import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('results')
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
          clients (id, name, contact_email),
          projects (id, name)
        ),
        performed_by_user:users!performed_by (id, name, email),
        validated_by_user:users!validated_by (id, name, email)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Result not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if user has access to this result (via sample company)
    if (userData?.company_id && data.samples?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    
    // Extract updatable fields
    const {
      methodology,
      findings,
      conclusion,
      diagnosis,
      pathogen_identified,
      pathogen_type,
      severity,
      confidence,
      result_type,
      recommendations,
      status,
      validated_by
    } = body

    // First, get the current result to check access
    const { data: currentResult, error: fetchError } = await supabase
      .from('results')
      .select(`
        *,
        samples!inner (company_id)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    // Check access
    if (userData?.company_id && currentResult.samples?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    // Only include fields that are provided
    if (methodology !== undefined) updateData.methodology = methodology
    if (findings !== undefined) updateData.findings = findings
    if (conclusion !== undefined) updateData.conclusion = conclusion
    if (diagnosis !== undefined) updateData.diagnosis = diagnosis
    if (pathogen_identified !== undefined) updateData.pathogen_identified = pathogen_identified
    if (pathogen_type !== undefined) updateData.pathogen_type = pathogen_type
    if (severity !== undefined) updateData.severity = severity
    if (confidence !== undefined) updateData.confidence = confidence
    if (result_type !== undefined) updateData.result_type = result_type
    if (recommendations !== undefined) updateData.recommendations = recommendations
    
    // Handle status and validation
    if (status !== undefined) {
      updateData.status = status
      if (status === 'validated' && !currentResult.validated_by) {
        updateData.validated_by = user.id
        updateData.validation_date = new Date().toISOString()
      }
    }

    if (validated_by !== undefined) {
      updateData.validated_by = validated_by
      updateData.validation_date = validated_by ? new Date().toISOString() : null
    }

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('results')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(`
        *,
        sample_tests (
          id,
          test_catalog (id, name, area),
          methods (id, name)
        ),
        samples (
          id,
          code,
          species,
          clients (id, name)
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
    console.error('Error updating result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  // PATCH uses the same logic as PUT for results
  return PUT(request, { params })
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // First, get the result to check access
    const { data: currentResult, error: fetchError } = await supabase
      .from('results')
      .select(`
        *,
        samples!inner (company_id)
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Result not found' }, { status: 404 })
    }

    // Check access
    if (userData?.company_id && currentResult.samples?.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Only allow deletion if result is not validated
    if (currentResult.status === 'validated') {
      return NextResponse.json({ error: 'Cannot delete validated results' }, { status: 403 })
    }

    const { error } = await supabase
      .from('results')
      .delete()
      .eq('id', resolvedParams.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Result deleted successfully' })
  } catch (error) {
    console.error('Error deleting result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}