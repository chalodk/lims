import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

const VALID_TYPES = ['virus', 'hongo', 'nematodo', 'bacteria', 'abiotico']

function generateCode(scientificName: string): string {
  return scientificName.trim().toUpperCase().replace(/\s+/g, '_')
}

export const GET = withAuth(async (request, { supabase }) => {
  try {
    const search = request.nextUrl.searchParams.get('search')

    let query = supabase
      .from('analytes')
      .select('*')
      .order('type')
      .order('scientific_name')

    if (search) {
      query = query.or(`scientific_name.ilike.%${search}%,code.ilike.%${search}%`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching analytes:', error)
      return NextResponse.json({ error: 'Error al obtener analitos' }, { status: 500 })
    }

    return NextResponse.json({ analytes: data })
  } catch (error) {
    console.error('Error en GET /api/admin/analytes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

export const POST = withAuth(async (request, { user, supabase }) => {
  try {
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener informacion del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (role !== 'csx') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.type || !body.scientific_name) {
      return NextResponse.json({ error: 'type y scientific_name son requeridos' }, { status: 400 })
    }

    if (!VALID_TYPES.includes(body.type)) {
      return NextResponse.json({ error: `type debe ser: ${VALID_TYPES.join(', ')}` }, { status: 400 })
    }

    const code = generateCode(body.scientific_name)

    const { data, error } = await supabase
      .from('analytes')
      .insert({
        type: body.type,
        scientific_name: body.scientific_name.trim(),
        code,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating analyte:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un analito con ese codigo o nombre' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al crear analito' }, { status: 500 })
    }

    return NextResponse.json({ analyte: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/analytes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
