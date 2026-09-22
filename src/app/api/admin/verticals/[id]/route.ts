import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const verticalId = url.pathname.split('/').pop()

    if (!verticalId) {
      return NextResponse.json({ error: 'ID de vertical requerido' }, { status: 400 })
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

    if (role !== 'csx' && role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { data, error } = await supabase.from('verticals').select('*').eq('id', verticalId).single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Vertical no encontrada' }, { status: 404 })
      }
      console.error('Error fetching vertical:', error)
      return NextResponse.json({ error: 'Error al obtener vertical' }, { status: 500 })
    }

    return NextResponse.json({ vertical: data })
  } catch (error) {
    console.error('Error en GET /api/admin/verticals/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

export const PUT = withAuth(async (request, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const verticalId = url.pathname.split('/').pop()

    if (!verticalId) {
      return NextResponse.json({ error: 'ID de vertical requerido' }, { status: 400 })
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
      return NextResponse.json({ error: 'Acceso denegado. Solo CSX puede modificar verticales.' }, { status: 403 })
    }

    const body = await request.json()

    const update: Record<string, unknown> = {
      updated_at: new Date().toISOString(),
    }

    if (body.label !== undefined) update.label = body.label
    if (body.description !== undefined) update.description = body.description
    if (body.icon !== undefined) update.icon = body.icon
    if (body.default_config !== undefined) update.default_config = body.default_config
    if (body.active !== undefined) update.active = body.active

    const { data, error } = await supabase.from('verticals').update(update).eq('id', verticalId).select().single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Vertical no encontrada' }, { status: 404 })
      }
      console.error('Error updating vertical:', error)
      return NextResponse.json({ error: 'Error al actualizar vertical' }, { status: 500 })
    }

    return NextResponse.json({ vertical: data })
  } catch (error) {
    console.error('Error en PUT /api/admin/verticals/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request, { user, supabase }) => {
  try {
    const url = new URL(request.url)
    const verticalId = url.pathname.split('/').pop()

    if (!verticalId) {
      return NextResponse.json({ error: 'ID de vertical requerido' }, { status: 400 })
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
      return NextResponse.json({ error: 'Acceso denegado. Solo CSX puede eliminar verticales.' }, { status: 403 })
    }

    const { data: vertical, error: fetchError } = await supabase
      .from('verticals')
      .select('key')
      .eq('id', verticalId)
      .single()

    if (fetchError || !vertical) {
      return NextResponse.json({ error: 'Vertical no encontrada' }, { status: 404 })
    }

    if (vertical.key === 'plagas_patogenos') {
      return NextResponse.json(
        { error: 'No se puede eliminar la vertical por defecto (plagas_patogenos)' },
        { status: 400 }
      )
    }

    const { data: companyCount } = await supabase
      .from('company_verticals')
      .select('id', { count: 'exact', head: true })
      .eq('vertical_id', verticalId)

    if (companyCount && (companyCount as unknown as { count: number }).count > 0) {
      return NextResponse.json(
        { error: 'No se puede eliminar una vertical que tiene empresas asociadas' },
        { status: 400 }
      )
    }

    const { error: deleteError } = await supabase.from('verticals').delete().eq('id', verticalId)

    if (deleteError) {
      console.error('Error deleting vertical:', deleteError)
      return NextResponse.json({ error: 'Error al eliminar vertical' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/admin/verticals/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
