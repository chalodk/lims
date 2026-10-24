import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'

/**
 * GET /api/admin/branding/companies
 * Companies con su logo. Solo csx.
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, logo_url')
      .order('name')

    if (companiesError) {
      console.error('Error fetching companies for branding:', companiesError)
      return NextResponse.json(
        { error: 'Error al obtener companies', details: companiesError.message },
        { status: 500 }
      )
    }

    const rows = (companies || []).map((company) => ({
      companyId: company.id,
      companyName: company.name,
      logoUrl: company.logo_url,
    }))

    return NextResponse.json({ companies: rows })
  } catch (error) {
    console.error('Error en GET /api/admin/branding/companies:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
