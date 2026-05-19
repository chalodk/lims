import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifySampleOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sampleId: string,
  userId: string
) {
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  const companyId = userData?.company_id
  if (!companyId) {
    return { authorized: false, error: 'Usuario sin empresa asignada', status: 400 }
  }

  const { data: sample } = await supabase
    .from('samples')
    .select('company_id')
    .eq('id', sampleId)
    .single()

  if (!sample || sample.company_id !== companyId) {
    return { authorized: false, error: 'Muestra no encontrada', status: 404 }
  }

  return { authorized: true, companyId }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { authorized, error, status } = await verifySampleOwnership(supabase, resolvedParams.id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const { data, error: queryError } = await supabase
      .from('sample_units')
      .select(`
        *,
        unit_results (
          *,
          test_catalog (*),
          methods (*)
        )
      `)
      .eq('sample_id', resolvedParams.id)

    if (queryError) {
      return NextResponse.json({ error: 'Error al obtener las unidades' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sample units:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
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
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { authorized, error, status } = await verifySampleOwnership(supabase, resolvedParams.id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const body = await request.json()
    const { code, label } = body

    const { data, error: insertError } = await supabase
      .from('sample_units')
      .insert({
        sample_id: resolvedParams.id,
        code,
        label
      })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Error al crear la unidad' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating sample unit:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
