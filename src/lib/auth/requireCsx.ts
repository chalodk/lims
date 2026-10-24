import { NextResponse } from 'next/server'
import type { SupabaseServerClient } from '@/lib/auth/api-auth'

export async function requireCsx(
  supabase: SupabaseServerClient,
  userId: string
): Promise<{ ok: true } | { ok: false; response: NextResponse }> {
  const { data: currentUser, error: userError } = await supabase
    .from('users')
    .select('role_id, roles(name)')
    .eq('id', userId)
    .single()

  if (userError || !currentUser) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 }),
    }
  }

  type RoleData = { name: string } | { name: string }[]
  const roleData = currentUser.roles as RoleData
  const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

  if (roleName !== 'csx') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Acceso denegado' }, { status: 403 }),
    }
  }

  return { ok: true }
}
