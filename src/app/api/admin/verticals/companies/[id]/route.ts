import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { isVerticalKey } from '@/config/verticals'
import { setCompanyPrimaryVertical } from '@/lib/services/companyVerticals'

/**
 * PUT /api/admin/verticals/companies/[id]
 * Body: { verticalKey }. Deja esa vertical como la única primaria activa. Solo csx.
 */
export const PUT = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)
    const body = await request.json().catch(() => null)
    const verticalKey = body?.verticalKey

    if (!isVerticalKey(verticalKey)) {
      return NextResponse.json({ error: 'verticalKey inválida' }, { status: 400 })
    }

    const { data: company, error: companyError } = await supabase
      .from('companies')
      .select('id, name')
      .eq('id', companyId)
      .single()

    if (companyError || !company) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    await setCompanyPrimaryVertical(supabase, companyId, verticalKey)

    if (verticalKey === 'suelo') {
      const { error: seedError } = await supabase.rpc('seed_soil_catalog', {
        p_company_id: companyId,
      })
      if (seedError) {
        console.error('Error seeding soil catalog:', seedError)
        return NextResponse.json(
          { error: 'Vertical asignada, pero falló la carga del catálogo de suelo', details: seedError.message },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      company: { companyId: company.id, companyName: company.name, verticalKey },
    })
  } catch (error) {
    console.error('Error en PUT /api/admin/verticals/companies/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error al asignar la vertical',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
