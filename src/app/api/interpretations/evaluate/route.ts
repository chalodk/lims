import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { InterpretationService } from '@/lib/services/interpretationService'

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sample_id } = body

    if (!sample_id) {
      return NextResponse.json(
        { error: 'sample_id es requerido' },
        { status: 400 }
      )
    }

    // Verify the sample belongs to user's company
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const { data: sample } = await supabase
      .from('samples')
      .select('company_id')
      .eq('id', sample_id)
      .single()

    if (!sample || sample.company_id !== companyId) {
      return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })
    }

    const interpretationService = new InterpretationService()
    const appliedInterpretations = await interpretationService.evaluateAndApplyRules(sample_id)

    return NextResponse.json({
      message: 'Reglas de interpretacion evaluadas correctamente',
      applied_interpretations: appliedInterpretations,
      count: appliedInterpretations.length
    })
  } catch (error) {
    console.error('Error evaluating interpretation rules:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
