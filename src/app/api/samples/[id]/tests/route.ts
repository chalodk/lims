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

    const { data, error } = await supabase
      .from('sample_tests')
      .select(`
        *,
        test_catalog (*),
        methods (*)
      `)
      .eq('sample_id', resolvedParams.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sample tests:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
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

    const body = await request.json()
    const { test_id, method_id } = body

    if (!test_id) {
      return NextResponse.json(
        { error: 'test_id is required' },
        { status: 400 }
      )
    }

    // Check if the test is already assigned to this sample
    const { data: existing } = await supabase
      .from('sample_tests')
      .select('id')
      .eq('sample_id', resolvedParams.id)
      .eq('test_id', test_id)
      .eq('method_id', method_id || null)
      .single()

    if (existing) {
      return NextResponse.json(
        { error: 'Test already assigned to this sample' },
        { status: 409 }
      )
    }

    const { data, error } = await supabase
      .from('sample_tests')
      .insert({
        sample_id: resolvedParams.id,
        test_id,
        method_id: method_id || null
      })
      .select(`
        *,
        test_catalog (*),
        methods (*)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating sample test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}