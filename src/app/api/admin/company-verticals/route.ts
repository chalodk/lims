import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name), company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener informacion del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    const companyIdParam = request.nextUrl.searchParams.get('company_id')

    let query = supabase.from('company_verticals').select(
      `
      *,
      verticals (
        id,
        key,
        label,
        description,
        icon,
        active
      ),
      companies (
        id,
        name
      )
    `
    )

    if (role === 'csx') {
      if (companyIdParam) {
        query = query.eq('company_id', companyIdParam)
      }
    } else if (role === 'admin') {
      if (!currentUser.company_id) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
      }
      query = query.eq('company_id', currentUser.company_id)
    } else {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching company verticals:', error)
      return NextResponse.json({ error: 'Error al obtener verticales de empresa' }, { status: 500 })
    }

    return NextResponse.json({ company_verticals: data })
  } catch (error) {
    console.error('Error en GET /api/admin/company-verticals:', error)
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
      .select('role_id, roles(name), company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener informacion del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (role !== 'csx') {
      return NextResponse.json(
        { error: 'Acceso denegado. Solo CSX puede asignar verticales a empresas.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    if (!body.company_id || !body.vertical_id) {
      return NextResponse.json({ error: 'company_id y vertical_id son requeridos' }, { status: 400 })
    }

    const { data: existingVertical } = await supabase
      .from('verticals')
      .select('id')
      .eq('id', body.vertical_id)
      .single()

    if (!existingVertical) {
      return NextResponse.json({ error: 'Vertical no encontrada' }, { status: 404 })
    }

    const { data: existingCompany } = await supabase
      .from('companies')
      .select('id')
      .eq('id', body.company_id)
      .single()

    if (!existingCompany) {
      return NextResponse.json({ error: 'Empresa no encontrada' }, { status: 404 })
    }

    const insert = {
      company_id: body.company_id,
      vertical_id: body.vertical_id,
      active: body.active !== false,
      is_primary: body.is_primary || false,
      created_by: user.id,
    }

    const { data, error } = await supabase
      .from('company_verticals')
      .insert(insert)
      .select(
        `
        *,
        verticals (
          id,
          key,
          label,
          description,
          icon,
          active
        ),
        companies (
          id,
          name
        )
      `
      )
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Esta empresa ya tiene asignada esta vertical' }, { status: 409 })
      }
      console.error('Error creating company vertical:', error)
      return NextResponse.json({ error: 'Error al asignar vertical a empresa' }, { status: 500 })
    }

    return NextResponse.json({ company_vertical: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/company-verticals:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
