import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

// Minimal types to avoid any in findings normalization
type MethodRow = { id: string; name: string }
type AnalyteRow = { id: string; scientific_name: string; name: string }
type VirologyTestInput = { identification?: string; method?: string; virus?: string; result?: string }
type PhytoTestInput = { microorganism?: string; method?: string; result?: string; [key: string]: unknown }
type TestInput = VirologyTestInput | PhytoTestInput
type NematologyTestInput = { name?: string; quantity?: string; [key: string]: unknown }
type FindingsObj = { 
  type?: string; 
  tests?: VirologyTestInput[]; 
  microorganisms?: PhytoTestInput[];
  nematodes?: NematologyTestInput[];
  [key: string]: unknown 
}

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const test_area = searchParams.get('test_area')
    const sample_id = searchParams.get('sample_id')
    const page = parseInt(searchParams.get('page') || '1')
    const limit = parseInt(searchParams.get('limit') || '20')

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    let query = supabase
      .from('results')
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

    // Apply filters
    if (status) {
      query = query.eq('status', status)
    }
    if (test_area) {
      query = query.eq('test_area', test_area)
    }
    if (sample_id) {
      query = query.eq('sample_id', sample_id)
    }

    // Filter by company - results should only show for samples from user's company
    // We'll filter this in the query by joining properly
    let baseQuery = query
    
    if (userData?.company_id) {
      // We need to filter by samples that belong to the user's company
      // First get sample IDs from the user's company
      const { data: companySamples } = await supabase
        .from('samples')
        .select('id')
        .eq('company_id', userData.company_id)
      
      if (companySamples && companySamples.length > 0) {
        const sampleIds = companySamples.map(s => s.id)
        baseQuery = baseQuery.in('sample_id', sampleIds)
      } else {
        // No samples for this company, return empty results
        return NextResponse.json({
          data: [],
          pagination: { page, limit, total: 0, pages: 0 }
        })
      }
    }

    // Apply pagination
    const from = (page - 1) * limit
    const to = from + limit - 1

    const { data, error, count } = await baseQuery
      .order('created_at', { ascending: false })
      .range(from, to)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Ensure data is always an array
    const resultsData = Array.isArray(data) ? data : []

    return NextResponse.json({
      data: resultsData,
      pagination: {
        page,
        limit,
        total: count || 0,
        pages: Math.ceil((count || 0) / limit)
      }
    })
  } catch (error) {
    console.error('Error fetching results:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      sample_id,
      sample_test_id,
      methodology,
      methodologies,
      identification_techniques,
      findings,
      conclusion,
      diagnosis,
      pathogen_identified,
      pathogen_type,
      severity,
      confidence,
      result_type,
      recommendations
    } = body

    if (!sample_id || !sample_test_id) {
      return NextResponse.json(
        { error: 'sample_id and sample_test_id are required' },
        { status: 400 }
      )
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    // Verify the sample belongs to the user's company
    const { data: sampleData, error: sampleError } = await supabase
      .from('samples')
      .select('company_id')
      .eq('id', sample_id)
      .single()

    if (sampleError || !sampleData) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    if (userData?.company_id && sampleData.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Unauthorized access to sample' }, { status: 403 })
    }

    // Verify the sample_test exists and belongs to the sample
    const { data: sampleTestData, error: sampleTestError } = await supabase
      .from('sample_tests')
      .select('*')
      .eq('id', sample_test_id)
      .eq('sample_id', sample_id)
      .single()

    if (sampleTestError || !sampleTestData) {
      return NextResponse.json({ error: 'Sample test not found or does not belong to sample' }, { status: 404 })
    }

    // Normalize findings to object and map IDs to names for virology
    let normalizedFindings: FindingsObj | null = findings as FindingsObj | null
    if (typeof normalizedFindings === 'string') {
      try {
        normalizedFindings = JSON.parse(normalizedFindings) as FindingsObj
      } catch {
        normalizedFindings = {}
      }
    }

    // Collect all IDs that need name resolution
    const methodIds: string[] = []
    const analyteIds: string[] = []

    // Process tests array (used by virology, phytopatology, etc.)
    if (normalizedFindings && Array.isArray(normalizedFindings.tests)) {
      normalizedFindings.tests.forEach((t: TestInput) => {
        // Collect method IDs
        if (t.method && typeof t.method === 'string') methodIds.push(t.method)
        
        // Collect analyte IDs from different fields
        if (t.virus && typeof t.virus === 'string') analyteIds.push(t.virus)
        if ('microorganism' in t && t.microorganism && typeof t.microorganism === 'string') analyteIds.push(t.microorganism)
      })
    }

    // Process nematology - nematodes might have IDs in name field
    if (normalizedFindings && Array.isArray(normalizedFindings.nematodes)) {
      normalizedFindings.nematodes.forEach((n: NematologyTestInput) => {
        if (n.name && typeof n.name === 'string') analyteIds.push(n.name)
      })
    }

    const uniqueMethodIds = Array.from(new Set(methodIds.filter(id => id)))
    const uniqueAnalyteIds = Array.from(new Set(analyteIds.filter(id => id)))

    // Fetch names from DB
    const [methodsRes, analytesRes] = await Promise.all([
      uniqueMethodIds.length > 0
        ? supabase.from('methods').select('id, name').in('id', uniqueMethodIds)
        : Promise.resolve({ data: [] as MethodRow[], error: null } as const),
      uniqueAnalyteIds.length > 0
        ? supabase.from('analytes').select('id, scientific_name, name').in('id', uniqueAnalyteIds)
        : Promise.resolve({ data: [] as AnalyteRow[], error: null } as const)
    ])

    const idToMethodName = new Map<string, string>((methodsRes.data || []).map((m: MethodRow) => [m.id, m.name]))
    const idToAnalyteName = new Map<string, string>((analytesRes.data || []).map((a: AnalyteRow) => [a.id, a.scientific_name || a.name]))

    // Map tests array (handles virology, phytopatology, etc.)
    if (normalizedFindings && Array.isArray(normalizedFindings.tests)) {
      const mappedTests = normalizedFindings.tests.map((t: TestInput) => {
        const mapped: TestInput = {
          ...t,
          method: t.method ? (idToMethodName.get(t.method) || t.method) : t.method,
          virus: t.virus && typeof t.virus === 'string' ? (idToAnalyteName.get(t.virus) || t.virus) : t.virus
        }
        
        // Handle microorganism field for phytopathology tests
        if ('microorganism' in t && t.microorganism) {
          (mapped as PhytoTestInput).microorganism = idToAnalyteName.get(t.microorganism) || t.microorganism
        }
        
        return mapped
      })
      normalizedFindings.tests = mappedTests
    }

    // Map nematology nematodes
    if (normalizedFindings && Array.isArray(normalizedFindings.nematodes)) {
      const mappedNematodes = normalizedFindings.nematodes.map((n: NematologyTestInput) => ({
        ...n,
        name: n.name ? (idToAnalyteName.get(n.name) || n.name) : n.name
      }))
      normalizedFindings.nematodes = mappedNematodes
    }

    // Combine findings with methodologies and identification_techniques
    const combinedFindings = {
      ...(normalizedFindings || {}),
      methodologies: methodologies || [],
      identification_techniques: identification_techniques || []
    }

    const resultData = {
      sample_id,
      sample_test_id,
      methodology: methodology || null,
      findings: combinedFindings || null,
      conclusion: conclusion || null,
      diagnosis: diagnosis || null,
      pathogen_identified: pathogen_identified || null,
      pathogen_type: pathogen_type || null,
      severity: severity || null,
      confidence: confidence || null,
      result_type: result_type || null,
      recommendations: recommendations || null,
      performed_by: user.id,
      performed_at: new Date().toISOString(),
      status: 'pending'
    }

    const { data, error } = await supabase
      .from('results')
      .insert(resultData)
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
        performed_by_user:users!performed_by (id, name, email)
      `)
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}