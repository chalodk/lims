import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type SupabaseServerClient } from '@/lib/auth/api-auth'

async function verifyUnitOwnership(
  supabase: SupabaseServerClient,
  sampleUnitId: string,
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

  // Two-hop verification: sample_units.sample_id → samples.company_id
  const { data: unit } = await supabase
    .from('sample_units')
    .select('sample_id, samples!inner(company_id)')
    .eq('id', sampleUnitId)
    .single()

  const sampleCompanyId = unit && Array.isArray(unit.samples) && unit.samples.length > 0
    ? (unit.samples[0] as Record<string, unknown>).company_id
    : null

  if (!unit || sampleCompanyId !== companyId) {
    return { authorized: false, error: 'Unidad no encontrada', status: 404 }
  }

  return { authorized: true, companyId }
}

export const GET = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { id } = await (params as Promise<{ id: string }>)

    const { authorized, error, status } = await verifyUnitOwnership(supabase, id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const { data, error: queryError } = await supabase
      .from('unit_results')
      .select(`
        *,
        test_catalog (*),
        methods (*)
      `)
      .eq('sample_unit_id', id)

    if (queryError) {
      return NextResponse.json({ error: 'Error al obtener los resultados' }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching unit results:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { id } = await (params as Promise<{ id: string }>)

    const { authorized, error, status } = await verifyUnitOwnership(supabase, id, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
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
        { error: 'test_id es requerido' },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from('unit_results')
      .select('id')
      .eq('sample_unit_id', id)
      .eq('test_id', test_id)
      .single()

    if (existing) {
      const { data, error: updateError } = await supabase
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

      if (updateError) {
        return NextResponse.json({ error: 'Error al actualizar el resultado' }, { status: 500 })
      }

      return NextResponse.json(data)
    } else {
      const { data, error: insertError } = await supabase
        .from('unit_results')
        .insert({
          sample_unit_id: id,
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

      if (insertError) {
        return NextResponse.json({ error: 'Error al crear el resultado' }, { status: 500 })
      }

      return NextResponse.json(data, { status: 201 })
    }
  } catch (error) {
    console.error('Error creating/updating unit result:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
