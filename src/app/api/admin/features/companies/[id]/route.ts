import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import {
  mergeFeatureFlagOverrides,
  parseFeatureFlagOverrides,
  parseFeatureFlagPatch,
  resolveCompanyFeatures,
} from '@/config/featureFlags'

/**
 * PATCH /api/admin/features/companies/[id]
 * Merge de overrides de feature flags. Solo csx.
 * Usa la sesión autenticada: RLS ya permite UPDATE a is_csx().
 */
export const PATCH = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const { id: companyId } = await (params as Promise<{ id: string }>)

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    type RoleData = { name: string } | { name: string }[]
    const roleData = currentUser.roles as RoleData
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (roleName !== 'csx') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const body = await request.json()
    const patch = parseFeatureFlagPatch(body.flags)
    if (!patch) {
      return NextResponse.json(
        { error: 'flags debe ser un objeto con keys conocidas y valores boolean' },
        { status: 400 }
      )
    }

    const { data: existing, error: fetchError } = await supabase
      .from('companies')
      .select('id, name, feature_flags')
      .eq('id', companyId)
      .single()

    if (fetchError || !existing) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    const nextOverrides = mergeFeatureFlagOverrides(existing.feature_flags, patch)

    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update({ feature_flags: nextOverrides })
      .eq('id', companyId)
      .select('id, name, feature_flags')
      .single()

    if (updateError || !updated) {
      console.error('Error updating company feature flags:', updateError)
      return NextResponse.json(
        { error: 'Error al actualizar flags', details: updateError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      company: {
        companyId: updated.id,
        companyName: updated.name,
        flags: resolveCompanyFeatures(parseFeatureFlagOverrides(updated.feature_flags)),
      },
    })
  } catch (error) {
    console.error('Error en PATCH /api/admin/features/companies/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
