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
      .from('unit_results')
      .select(`
        *,
        test_catalog (*),
        methods (*)
      `)
      .eq('sample_unit_id', resolvedParams.id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching unit results:', error)
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
    const { 
      test_id, 
      method_id, 
      analyte, 
      result_value, 
      result_flag = 'na', 
      notes 
    } = body

    if (!test_id) {
      return NextResponse.json(
        { error: 'test_id is required' },
        { status: 400 }
      )
    }

    // Check if result already exists for this unit/test combination
    const { data: existing } = await supabase
      .from('unit_results')
      .select('id')
      .eq('sample_unit_id', resolvedParams.id)
      .eq('test_id', test_id)
      .single()

    if (existing) {
      // Update existing result
      const { data, error } = await supabase
        .from('unit_results')
        .update({
          method_id,
          analyte,
          result_value,
          result_flag,
          notes
        })
        .eq('id', existing.id)
        .select(`
          *,
          test_catalog (*),
          methods (*)
        `)
        .single()

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      // Create new result
      const { data, error } = await supabase
        .from('unit_results')
        .insert({
          sample_unit_id: resolvedParams.id,
          test_id,
          method_id,
          analyte,
          result_value,
          result_flag,
          notes
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
    }
  } catch (error) {
    console.error('Error creating/updating unit result:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}