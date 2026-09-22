import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (request, { user, supabase }) => {
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

    if (role !== 'csx' && role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const includeInactive = request.nextUrl.searchParams.get('include_inactive') === 'true'

    let query = supabase.from('verticals').select('*')

    if (!includeInactive) {
      query = query.eq('active', true)
    }

    const { data, error } = await query.order('label', { ascending: true })

    if (error) {
      console.error('Error fetching verticals:', error)
      return NextResponse.json({ error: 'Error al obtener verticales' }, { status: 500 })
    }

    return NextResponse.json({ verticals: data })
  } catch (error) {
    console.error('Error en GET /api/admin/verticals:', error)
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
      return NextResponse.json({ error: 'Acceso denegado. Solo CSX puede crear verticales.' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.key || !body.label) {
      return NextResponse.json({ error: 'key y label son requeridos' }, { status: 400 })
    }

    const insert = {
      key: body.key,
      label: body.label,
      description: body.description || null,
      icon: body.icon || null,
      default_config: body.default_config || {},
      active: body.active !== false,
    }

    const { data, error } = await supabase.from('verticals').insert(insert).select().single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Ya existe una vertical con key '${body.key}'` }, { status: 409 })
      }
      console.error('Error creating vertical:', error)
      return NextResponse.json({ error: 'Error al crear vertical' }, { status: 500 })
    }

    return NextResponse.json({ vertical: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/verticals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
