import { NextResponse } from 'next/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { getRequestOrigin } from '@/lib/branding/hostBranding'
import { adminSetPasswordUrl, executeInviteCompanyAdmin } from '@/lib/companies/inviteCompanyAdmin'

/**
 * POST /api/admin/companies/[id]/admin
 * Invita al primer admin de la company. Solo CSX.
 * Auth envía el correo de confirmación. El perfil lo inserta create_company_first_admin.
 */
export const POST = withAuth(async (request, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json({ error: 'El nombre y el email son requeridos' }, { status: 400 })
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    if (!supabaseUrl || !serviceRoleKey) {
      console.error('Falta NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY')
      return NextResponse.json({ error: 'Error al invitar al administrador' }, { status: 500 })
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name')
      .eq('id', companyId)
      .maybeSingle()

    if (companyError) {
      console.error('Error al leer la compañía para la invitación:', companyError)
      return NextResponse.json({ error: 'Error al invitar al administrador' }, { status: 500 })
    }
    if (!company?.name) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    const supabaseAdmin = createAdminClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false },
    })
    const requestOrigin = getRequestOrigin(
      request.headers.get('host'),
      request.headers.get('x-forwarded-host'),
      request.headers.get('x-forwarded-proto')
    )
    const setPasswordUrl = adminSetPasswordUrl(requestOrigin)

    const result = await executeInviteCompanyAdmin(companyId, company.name, body, setPasswordUrl, {
      emailIsRegistered: async (email) => {
        const { data, error } = await supabase.rpc('csx_email_is_registered', { p_email: email })
        return {
          registered: data === true,
          error: error ? { code: error.code, message: error.message } : null,
        }
      },
      inviteAdmin: async ({ email, userName, companyName, redirectTo: inviteRedirectTo }) => {
        const { data, error } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
          redirectTo: inviteRedirectTo,
          data: { companyName, userName, setPasswordUrl: inviteRedirectTo },
        })
        return {
          userId: data?.user?.id ?? null,
          error: error ? { code: error.code, message: error.message } : null,
        }
      },
      createProfile: async (profile) => {
        const { data, error } = await supabase.rpc('create_company_first_admin', {
          p_user_id: profile.userId,
          p_company_id: profile.companyId,
          p_name: profile.name,
          p_email: profile.email,
        })
        return {
          data,
          error: error ? { code: error.code, message: error.message } : null,
        }
      },
      deleteAuthUser: async (userId) => {
        const { error } = await supabaseAdmin.auth.admin.deleteUser(userId)
        if (error) throw new Error(error.message)
      },
    })

    if ('logMessage' in result && result.logMessage) {
      console.error('Error en POST /api/admin/companies/[id]/admin:', result.logMessage)
    }

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Error en POST /api/admin/companies/[id]/admin:', error)
    return NextResponse.json({ error: 'Error al invitar al administrador' }, { status: 500 })
  }
})
