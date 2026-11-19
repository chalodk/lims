import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { getSessionVerticalForUser } from '@/lib/services/companyVerticals'

/**
 * GET /api/verticals/current
 * Vertical primaria y activa de la company del usuario autenticado.
 * Sin asignación responde { status: 'none' }: no hay fallback a plagas.
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

    const { vertical, companyId } = await getSessionVerticalForUser(
      supabase,
      user.id,
      currentUser.company_id
    )

    return NextResponse.json({ vertical, companyId })
  } catch (error) {
    console.error('Error en GET /api/verticals/current:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener la vertical',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
