import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { listSoilAnalyses, requireSoilLab } from '@/lib/services/soilService'

/**
 * GET /api/soil/catalog
 * Matrices y análisis de suelo de la company (incluye inactivos con su nota pendiente).
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const [{ data: matrices, error: matricesError }, analyses] = await Promise.all([
      supabase.from('soil_matrices').select('id, key, name').order('name'),
      listSoilAnalyses(supabase, access.companyId),
    ])
    if (matricesError) throw new Error(matricesError.message)

    return NextResponse.json({ matrices: matrices || [], analyses })
  } catch (error) {
    console.error('Error en GET /api/soil/catalog:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener el catálogo de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
