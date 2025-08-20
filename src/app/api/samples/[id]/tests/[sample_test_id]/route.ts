import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string; sample_test_id: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Verify the sample test belongs to the specified sample
    const { data: sampleTest, error: fetchError } = await supabase
      .from('sample_tests')
      .select('id')
      .eq('id', params.sample_test_id)
      .eq('sample_id', params.id)
      .single()

    if (fetchError || !sampleTest) {
      return NextResponse.json(
        { error: 'Sample test not found' },
        { status: 404 }
      )
    }

    const { error } = await supabase
      .from('sample_tests')
      .delete()
      .eq('id', params.sample_test_id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ message: 'Sample test deleted successfully' })
  } catch (error) {
    console.error('Error deleting sample test:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}