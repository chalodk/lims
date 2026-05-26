import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

const PDFMONKEY_API_KEY = '7mCRJHas8oqUQxsQX-in'

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

    const templateId = request.nextUrl.searchParams.get('template_id')
    if (!templateId) {
      return NextResponse.json({ error: 'template_id es requerido' }, { status: 400 })
    }

    const res = await fetch(
      `https://api.pdfmonkey.io/api/v1/document_templates/${templateId}`,
      {
        headers: {
          Authorization: `Bearer ${PDFMONKEY_API_KEY}`,
        },
      }
    )

    if (!res.ok) {
      console.error('PDFMonkey template preview error:', res.status, await res.text())
      return NextResponse.json({ error: 'Error al obtener previsualizacion' }, { status: 502 })
    }

    const template = await res.json() as Record<string, unknown>
    const doc = (template.document_template || template) as Record<string, unknown>
    console.log('PDFMonkey template preview_url:', doc.preview_url)

    return NextResponse.json({ preview_url: (doc.preview_url as string) || null })
  } catch (error) {
    console.error('Error en GET /api/admin/templates/preview:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
