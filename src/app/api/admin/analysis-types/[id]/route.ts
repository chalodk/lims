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

    const update: Record<string, unknown> = { updated_at: new Date().toISOString() }
    const updatableFields = [
      'key', 'label', 'initial', 'bg_color', 'text_color',
      'db_areas', 'pdfmonkey_template_id', 'template_env_var',
      'titulo_informe', 'tipo_analisis_descripcion', 'metodologia_descripcion', 'active'
    ]

    for (const field of updatableFields) {
      if (body[field] !== undefined) {
        update[field] = body[field]
      }
    }

    if (Object.keys(update).length === 1) {
      return NextResponse.json({ error: 'No hay campos para actualizar' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('analysis_types')
      .update(update)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Ya existe un tipo con key '${body.key}'` }, { status: 409 })
      }
      console.error('Error updating analysis type:', error)
      return NextResponse.json({ error: 'Error al actualizar tipo de analisis' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ analysis_type: data })
  } catch (error) {
    console.error('Error en PATCH /api/admin/analysis-types/[id]:', error)
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

    // Soft delete
    const { data, error } = await supabase
      .from('analysis_types')
      .update({ active: false, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('Error deleting analysis type:', error)
      return NextResponse.json({ error: 'Error al desactivar tipo de analisis' }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({ error: 'Tipo no encontrado' }, { status: 404 })
    }

    return NextResponse.json({ analysis_type: data })
  } catch (error) {
    console.error('Error en DELETE /api/admin/analysis-types/[id]:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
