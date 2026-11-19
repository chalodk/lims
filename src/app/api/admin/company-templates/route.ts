import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const companyId = request.nextUrl.searchParams.get('company_id')
    if (!companyId) {
      return NextResponse.json({ error: 'company_id es requerido' }, { status: 400 })
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
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const body = await request.json()

    if (!body.company_id || !body.analysis_type_key || !body.pdfmonkey_template_id) {
      return NextResponse.json(
        { error: 'company_id, analysis_type_key y pdfmonkey_template_id son requeridos' },
        { status: 400 }
      )
    }

    const { data, error } = await supabase
      .from('company_analysis_type_templates')
      .upsert({
        company_id: body.company_id,
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
