import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: reportId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id if available
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Minimal query first to test basic structure
    const { data: report, error } = await supabase
      .from('reports')
      .select(`
        id,
        created_at,
        status,
        template,
        include_recommendations,
        include_images,
        test_areas,
        company_id,
        client_id,
        responsible_id,
        generated_by,
        download_url,
        clients (
          id,
          name,
          rut
        ),
        results (
          id,
          status,
          result_type,
          diagnosis,
          conclusion,
          recommendations,
          pathogen_identified,
          test_area,
          samples (
            id,
            code,
            species,
            variety,
            received_date
          ),
          sample_tests (
            id,
            test_catalog (
              id,
              name,
              code,
              area
            ),
            methods (
              id,
              name,
              code
            )
          )
        )
      `)
      .eq('id', reportId)
      .single()

    if (error) {
      console.error('Database error:', error)
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Report not found' }, { status: 404 })
      }
      return NextResponse.json({ 
        error: error.message || 'Database error', 
        details: error 
      }, { status: 500 })
    }

    // Check company access (only if userData exists and has company_id)
    if (userData?.company_id && report.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error fetching report details:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}