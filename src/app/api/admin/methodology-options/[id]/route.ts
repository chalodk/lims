import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const PATCH = withAuth(async (request, { user, supabase }) => {
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

    const { pathname } = new URL(request.url)
    const segments = pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const body = await request.json()

    const update: Record<string, unknown> = {}
    if (body.name !== undefined) update.name = body.name
    if (body.active !== undefined) update.active = body.active
    if (body.category !== undefined) {
      if (!['methodology', 'technique'].includes(body.category)) {
        return NextResponse.json({ error: 'category debe ser methodology o technique' }, { status: 400 })
      }
      update.category = body.category
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('methodology_options')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error updating methodology option:', error)
      return NextResponse.json({ error: 'Error al actualizar opcion' }, { status: 500 })
    }

    return NextResponse.json({ methodology_option: data })
  } catch (error) {
    console.error('Error en PATCH /api/admin/methodology-options:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

export const DELETE = withAuth(async (request, { user, supabase }) => {
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

    const { pathname } = new URL(request.url)
    const segments = pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    const { error } = await supabase
      .from('methodology_options')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting methodology option:', error)
      return NextResponse.json({ error: 'Error al eliminar opcion' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/admin/methodology-options:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
