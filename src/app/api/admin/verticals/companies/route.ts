import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'

type CompanyVerticalJoin = {
  active: boolean
  is_primary: boolean
  verticals: { key: string } | { key: string }[] | null
}

/**
 * GET /api/admin/verticals/companies
 * Vertical primaria activa de cada company (csx). null = sin vertical asignada.
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { data: companies, error: companiesError } = await supabase
      .from('companies')
      .select('id, name, company_verticals(active, is_primary, verticals(key))')
      .order('name')

    if (companiesError) {
      console.error('Error fetching company verticals:', companiesError)
      return NextResponse.json(
        { error: 'Error al obtener companies', details: companiesError.message },
        { status: 500 }
      )
    }

    const rows = (companies || []).map((company) => {
      const assignments = (company.company_verticals || []) as CompanyVerticalJoin[]
      const primaryAssignment = assignments.find((row) => row.active && row.is_primary)
      const vertical = Array.isArray(primaryAssignment?.verticals)
        ? primaryAssignment?.verticals[0]
        : primaryAssignment?.verticals
      return {
        companyId: company.id,
        companyName: company.name,
        verticalKey: vertical?.key ?? null,
      }
    })

    return NextResponse.json({ companies: rows })
  } catch (error) {
    console.error('Error en GET /api/admin/verticals/companies:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
