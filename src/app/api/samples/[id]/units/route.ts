import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import type { SupabaseServerClient } from '@/lib/auth/api-auth'

type ServerClient = SupabaseServerClient

async function verifySampleOwnership(
  supabase: ServerClient,
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

export const GET = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { id } = await (params as Promise<{ id: string }>)

    const { authorized, error, status } = await verifySampleOwnership(supabase, id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const { data, error: queryError } = await supabase
      .from('sample_units')
      .select(`*, unit_results (*, test_catalog (*), methods (*))`)
      .eq('sample_id', id)

    if (queryError) {
      return NextResponse.json({ error: 'Error al obtener las unidades' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sample units:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})

export const POST = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { id } = await (params as Promise<{ id: string }>)

    const { authorized, error, status } = await verifySampleOwnership(supabase, id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const body = await request.json()
    const { code, label } = body

    const { data, error: insertError } = await supabase
      .from('sample_units')
      .insert({ sample_id: id, code, label })
      .select()
      .single()

    if (insertError) {
      return NextResponse.json({ error: 'Error al crear la unidad' }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (error) {
    console.error('Error creating sample unit:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})
