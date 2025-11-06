import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const userId = id

    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es admin
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    // Verificar rol admin
    type RoleData = { id: number; name: string } | { id: number; name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener el role_id del usuario objetivo directamente desde la tabla users
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('role_id')
      .eq('id', userId)
      .single()

    if (targetError) {
      // Si el usuario no existe en public.users, no tiene rol asignado
      if (targetError.code === 'PGRST116') {
        return NextResponse.json({ role_id: null })
      }
      return NextResponse.json({ 
        error: 'Error al obtener rol del usuario',
        details: targetError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      role_id: targetUser?.role_id || null
    })
  } catch (error) {
    console.error('Error en GET /api/settings/users/[id]/role:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

