import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { executeCreateCompany } from '@/lib/companies/createCompany'
import { mergeCompanyAdminEmails } from '@/lib/companies/inviteCompanyAdmin'

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

    const { data, error } = await supabase
      .from('companies')
      .select('id, name')
      .order('name')

    if (error) {
      console.error('Error fetching companies:', error)
      return NextResponse.json({ error: 'Error al obtener companies' }, { status: 500 })
    }

    if (role !== 'csx') {
      return NextResponse.json({ companies: data })
    }

    const { data: adminRows, error: adminError } = await supabase.rpc('csx_company_first_admins')
    if (adminError) {
      console.error('Error fetching company admins:', adminError)
      return NextResponse.json({ error: 'Error al obtener companies' }, { status: 500 })
    }

    return NextResponse.json({
      companies: mergeCompanyAdminEmails(data || [], adminRows),
    })
  } catch (error) {
    console.error('Error en GET /api/admin/companies:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor', details: error instanceof Error ? error.message : 'Error desconocido' },
      { status: 500 }
    )
  }
})

/**
 * POST /api/admin/companies
 * Alta de una company. Solo CSX. El body aporta el nombre;
 * plan, trial, flags y created_by los fija create_company().
 */
export const POST = withAuth(async (request, { user, supabase }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    const result = await executeCreateCompany(body, async (companyName) => {
      const { data, error } = await supabase.rpc('create_company', { p_name: companyName })
      return {
        data,
        error: error ? { code: error.code, message: error.message } : null,
      }
    })

    if ('logMessage' in result && result.logMessage) {
      console.error('Error en POST /api/admin/companies:', result.logMessage)
    }

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Error en POST /api/admin/companies:', error)
    return NextResponse.json({ error: 'Error al crear la compañía' }, { status: 500 })
  }
})
