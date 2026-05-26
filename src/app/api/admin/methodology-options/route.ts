import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (request, { supabase }) => {
  try {
    const showAll = request.nextUrl.searchParams.get('all') === 'true'

    let query = supabase
      .from('methodology_options')
      .select('*')
      .order('category')
      .order('created_at', { ascending: true })

    if (!showAll) {
      query = query.eq('active', true)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching methodology options:', error)
      return NextResponse.json({ error: 'Error al obtener opciones' }, { status: 500 })
    }

    return NextResponse.json({ methodology_options: data })
  } catch (error) {
    console.error('Error en GET /api/admin/methodology-options:', error)
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

    if (!body.name || !body.category) {
      return NextResponse.json({ error: 'name y category son requeridos' }, { status: 400 })
    }

    if (!['methodology', 'technique'].includes(body.category)) {
      return NextResponse.json({ error: 'category debe ser methodology o technique' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('methodology_options')
      .insert({
        name: body.name,
        category: body.category,
      })
      .select()
      .single()

    if (error) {
      console.error('Error creating methodology option:', error)
      return NextResponse.json({ error: 'Error al crear opcion' }, { status: 500 })
    }

    return NextResponse.json({ methodology_option: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/methodology-options:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
