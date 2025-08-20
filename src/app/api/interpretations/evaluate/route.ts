import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InterpretationService } from '@/lib/services/interpretationService'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { sample_id } = body

    if (!sample_id) {
      return NextResponse.json(
        { error: 'sample_id is required' },
        { status: 400 }
      )
    }

    const interpretationService = new InterpretationService()
    const appliedInterpretations = await interpretationService.evaluateAndApplyRules(sample_id)

    return NextResponse.json({
      message: 'Interpretation rules evaluated successfully',
      applied_interpretations: appliedInterpretations,
      count: appliedInterpretations.length
    })
  } catch (error) {
    console.error('Error evaluating interpretation rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}