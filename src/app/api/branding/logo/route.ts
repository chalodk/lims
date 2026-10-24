import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { resolveUserCompanyId } from '@/lib/services/companyFeatureFlags'
import { readCompanyLogoForCompany } from '@/lib/branding/companyLogoStorage'

/**
 * GET /api/branding/logo
 * Logo de la company del usuario autenticado. NULL si no tiene.
 * El host Nemachile no usa este valor en el menú.
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const companyId = await resolveUserCompanyId(supabase, user.id, currentUser.company_id)
    if (!companyId) {
      return NextResponse.json({ logoUrl: null, companyName: null })
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('name, logo_url')
      .eq('id', companyId)
      .maybeSingle()

    if (!companyError && company) {
      return NextResponse.json({
        logoUrl: company.logo_url,
        companyName: company.name,
      })
    }

    try {
      const fallback = await readCompanyLogoForCompany(companyId)
      return NextResponse.json(fallback)
    } catch (fallbackError) {
      console.error('Error reading company logo:', fallbackError)
      return NextResponse.json({ logoUrl: null, companyName: null })
    }
  } catch (error) {
    console.error('Error en GET /api/branding/logo:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener el logo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
