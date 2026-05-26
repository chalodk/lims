import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const DELETE = withAuth(async (request, { user, supabase }) => {
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

    const companyId = currentUser.company_id

    const { pathname } = new URL(request.url)
    const segments = pathname.split('/')
    const id = segments[segments.length - 1]

    if (!id) {
      return NextResponse.json({ error: 'ID requerido' }, { status: 400 })
    }

    // csx puede eliminar templates de cualquier company
    if (role === 'admin') {
      if (!companyId) {
        return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
      }

      // Verificar que el template pertenece a la company del usuario
      const { data: existing, error: fetchError } = await supabase
        .from('company_analysis_type_templates')
        .select('id')
        .eq('id', id)
        .eq('company_id', companyId)
        .single()

      if (fetchError || !existing) {
        return NextResponse.json({ error: 'Template no encontrado' }, { status: 404 })
      }
    }

    const { error } = await supabase
      .from('company_analysis_type_templates')
      .delete()
      .eq('id', id)

    if (error) {
      console.error('Error deleting company template:', error)
      return NextResponse.json({ error: 'Error al eliminar template' }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error('Error en DELETE /api/admin/company-templates:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})
