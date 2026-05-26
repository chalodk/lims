import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { createClient } from '@/lib/supabase/server'

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

    const dbArea = request.nextUrl.searchParams.get('db_area')

    let query = supabase
      .from('analysis_types')
      .select('*')
      .eq('active', true)

    if (dbArea) {
      query = query.contains('db_areas', [dbArea])
    }

    const { data, error } = await query.order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching analysis types:', error)
      return NextResponse.json({ error: 'Error al obtener tipos de analisis' }, { status: 500 })
    }

    return NextResponse.json({ analysis_types: data })
  } catch (error) {
    console.error('Error en GET /api/admin/analysis-types:', error)
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

    if (!body.key || !body.label) {
      return NextResponse.json({ error: 'key y label son requeridos' }, { status: 400 })
    }

    const insert = {
      key: body.key,
      label: body.label,
      initial: body.initial || body.label.charAt(0).toUpperCase(),
      bg_color: body.bg_color || 'bg-gray-500',
      text_color: body.text_color || 'text-white',
      db_areas: body.db_areas || [],
      pdfmonkey_template_id: body.pdfmonkey_template_id || null,
      template_env_var: body.template_env_var || null,
      titulo_informe: body.titulo_informe || '',
      tipo_analisis_descripcion: body.tipo_analisis_descripcion || '',
      metodologia_descripcion: body.metodologia_descripcion || '',
    }

    const { data, error } = await supabase
      .from('analysis_types')
      .insert(insert)
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json({ error: `Ya existe un tipo con key '${body.key}'` }, { status: 409 })
      }
      console.error('Error creating analysis type:', error)
      return NextResponse.json({ error: 'Error al crear tipo de analisis' }, { status: 500 })
    }

    return NextResponse.json({ analysis_type: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/analysis-types:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
