import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'


export async function GET(request: NextRequest) {
  try {
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

    const companyId = userData?.company_id

    // Get query parameters
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')

    // Query for recent samples
    let query = supabase
      .from('samples')
      .select(`
        id,
        code,
        species,
        variety,
        status,
        received_date,
        created_at,
        clients (id, name),
        projects (id, name),
        sample_tests (
          id,
          test_catalog (id, name, area)
        )
      `)
      .order('created_at', { ascending: false })
      .limit(limit)

    // Apply company filter if user has company_id
    if (companyId) {
      query = query.eq('company_id', companyId)
    }

    const { data: samples, error } = await query

    if (error) {
      console.error('Error fetching recent samples:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Format the response with additional computed fields
    const formattedSamples = samples?.map(sample => ({
      ...sample,
      daysAgo: Math.floor((Date.now() - new Date(sample.created_at).getTime()) / (1000 * 60 * 60 * 24)),
      testAreas: sample.sample_tests?.flatMap((st: { test_catalog: { area: string }[] }) => 
        st.test_catalog.map(tc => tc.area)
      ).filter(Boolean) || [],
      statusLabel: getStatusLabel(sample.status)
    })) || []

    return NextResponse.json({
      samples: formattedSamples,
      total: samples?.length || 0
    })
  } catch (error) {
    console.error('Error fetching recent samples:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function getStatusLabel(status: string): string {
  const statusLabels: { [key: string]: string } = {
    received: 'Recibida',
    processing: 'En Proceso',
    microscopy: 'Microscopía',
    isolation: 'Aislamiento',
    identification: 'Identificación',
    molecular_analysis: 'Análisis Molecular',
    validation: 'Validación',
    completed: 'Completada'
  }
  
  return statusLabels[status] || status
}