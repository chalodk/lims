import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const PUT = withAuth(async (request, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const companyVerticalId = url.pathname.split('/').pop()

    if (!companyVerticalId) {
      return NextResponse.json({ error: 'ID de company_vertical requerido' }, { status: 400 })
    }

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
      return NextResponse.json(
        { error: 'Acceso denegado. Solo CSX puede modificar asignaciones de verticales.' },
        { status: 403 }
      )
    }

    const body = await request.json()

    const update: Record<string, unknown> = {}

    if (body.active !== undefined) update.active = body.active
    if (body.is_primary !== undefined) update.is_primary = body.is_primary

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('company_verticals')
      .update(update)
      .eq('id', companyVerticalId)
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
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Asignacion de vertical no encontrada' }, { status: 404 })
      }
      console.error('Error updating company vertical:', error)
      return NextResponse.json({ error: 'Error al actualizar asignacion de vertical' }, { status: 500 })
    }

    return NextResponse.json({ company_vertical: data })
  } catch (error) {
    console.error('Error en PUT /api/admin/company-verticals/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const companyVerticalId = url.pathname.split('/').pop()

    if (!companyVerticalId) {
      return NextResponse.json({ error: 'ID de company_vertical requerido' }, { status: 400 })
    }

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
      return NextResponse.json(
        { error: 'Acceso denegado. Solo CSX puede eliminar asignaciones de verticales.' },
        { status: 403 }
      )
    }

    const { data: companyVertical, error: fetchError } = await supabase
      .from('company_verticals')
      .select(
        `
        id,
        company_id,
        vertical_id,
        is_primary,
        verticals (
          key
        )
      `
      )
      .eq('id', companyVerticalId)
      .single()

    if (fetchError || !companyVertical) {
      return NextResponse.json({ error: 'Asignacion de vertical no encontrada' }, { status: 404 })
    }

    const verticalData = companyVertical.verticals as unknown as { key: string } | null
    if (verticalData?.key === 'plagas_patogenos' && companyVertical.is_primary) {
      const { data: otherVerticals } = await supabase
        .from('company_verticals')
        .select('id')
        .eq('company_id', companyVertical.company_id)
        .neq('id', companyVerticalId)

      if (!otherVerticals || otherVerticals.length === 0) {
        return NextResponse.json(
          { error: 'No se puede eliminar la unica vertical asignada a la empresa' },
          { status: 400 }
        )
      }
    }

    const { error: deleteError } = await supabase.from('company_verticals').delete().eq('id', companyVerticalId)

    if (deleteError) {
      console.error('Error deleting company vertical:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar asignacion de vertical' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/admin/company-verticals/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
