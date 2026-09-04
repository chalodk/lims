import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { getFeaturesForUser } from '@/lib/services/companyFeatureFlags'

/**
 * GET /api/features
 * Flags resueltos de la company del usuario autenticado.
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

    const { flags, companyId } = await getFeaturesForUser(
      supabase,
      user.id,
      currentUser.company_id
    )

    return NextResponse.json({ flags, companyId })
  } catch (error) {
    console.error('Error en GET /api/features:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener features',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
