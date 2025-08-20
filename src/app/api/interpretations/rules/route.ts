import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InterpretationService } from '@/lib/services/interpretationService'

export async function GET(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const area = searchParams.get('area') || undefined
    const active = searchParams.get('active')

    const interpretationService = new InterpretationService()
    const rules = await interpretationService.getRules({
      area,
      active: active !== null ? active === 'true' : undefined
    })

    return NextResponse.json(rules)
  } catch (error) {
    console.error('Error fetching interpretation rules:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      area,
      species,
      crop_next,
      analyte,
      comparator,
      threshold_json,
      message,
      severity,
      active = true
    } = body

    if (!area || !analyte || !comparator || !threshold_json || !message || !severity) {
      return NextResponse.json(
        { error: 'area, analyte, comparator, threshold_json, message, and severity are required' },
        { status: 400 }
      )
    }

    const interpretationService = new InterpretationService()
    const rule = await interpretationService.createRule({
      area,
      species: species || null,
      crop_next: crop_next || null,
      analyte,
      comparator,
      threshold_json,
      message,
      severity,
      active
    })

    if (!rule) {
      return NextResponse.json(
        { error: 'Failed to create interpretation rule' },
        { status: 500 }
      )
    }

    return NextResponse.json(rule, { status: 201 })
  } catch (error) {
    console.error('Error creating interpretation rule:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}