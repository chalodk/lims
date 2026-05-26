import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

const VALID_TYPES = ['virus', 'hongo', 'nematodo', 'bacteria', 'abiotico']

function generateCode(scientificName: string): string {
  return scientificName.trim().toUpperCase().replace(/\s+/g, '_')
}

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
    if (body.type !== undefined) {
      if (!VALID_TYPES.includes(body.type)) {
        return NextResponse.json({ error: `type debe ser: ${VALID_TYPES.join(', ')}` }, { status: 400 })
      }
      update.type = body.type
    }
    if (body.scientific_name !== undefined) {
      update.scientific_name = body.scientific_name.trim()
      update.code = generateCode(body.scientific_name)
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('analytes')
      .update(update)
      .eq('id', parseInt(id))
      .select()
      .single()

    if (error) {
      console.error('Error updating analyte:', error)
      if (error.code === '23505') {
        return NextResponse.json({ error: 'Ya existe un analito con ese codigo' }, { status: 409 })
      }
      return NextResponse.json({ error: 'Error al actualizar analito' }, { status: 500 })
    }

    return NextResponse.json({ analyte: data })
  } catch (error) {
    console.error('Error en PATCH /api/admin/analytes:', error)
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
      .from('analytes')
      .delete()
      .eq('id', parseInt(id))

    if (error) {
      console.error('Error deleting analyte:', error)
      return NextResponse.json({ error: 'Error al eliminar analito' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/admin/analytes:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
