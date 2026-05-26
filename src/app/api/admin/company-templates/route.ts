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

    if (role !== 'admin' && role !== 'csx') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // csx debe especificar company_id; admin usa su propia company
    let companyId: string | null = null
    if (role === 'csx') {
      companyId = request.nextUrl.searchParams.get('company_id')
      if (!companyId) {
        return NextResponse.json({ error: 'company_id es requerido para csx' }, { status: 400 })
      }
    } else {
      companyId = currentUser.company_id
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('company_analysis_type_templates')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: true })

    if (error) {
      console.error('Error fetching company templates:', error)
      return NextResponse.json({ error: 'Error al obtener templates de la empresa' }, { status: 500 })
    }

    return NextResponse.json({ templates: data })
  } catch (error) {
    console.error('Error en GET /api/admin/company-templates:', error)
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

    if (role !== 'admin' && role !== 'csx') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()

    if (!body.analysis_type_key || !body.pdfmonkey_template_id) {
      return NextResponse.json({ error: 'analysis_type_key y pdfmonkey_template_id son requeridos' }, { status: 400 })
    }

    // csx debe especificar company_id en el body; admin usa su propia company
    let companyId: string
    if (role === 'csx') {
      if (!body.company_id) {
        return NextResponse.json({ error: 'company_id es requerido para csx' }, { status: 400 })
      }
      companyId = body.company_id
    } else {
      companyId = currentUser.company_id
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
      }
    }

    const { data, error } = await supabase
      .from('company_analysis_type_templates')
      .upsert({
        company_id: companyId,
        analysis_type_key: body.analysis_type_key,
        pdfmonkey_template_id: body.pdfmonkey_template_id,
        updated_at: new Date().toISOString(),
      }, {
        onConflict: 'company_id,analysis_type_key',
      })
      .select()
      .single()

    if (error) {
      console.error('Error upserting company template:', error)
      return NextResponse.json({ error: 'Error al guardar template' }, { status: 500 })
    }

    return NextResponse.json({ template: data }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/admin/company-templates:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
