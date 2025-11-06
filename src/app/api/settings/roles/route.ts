import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET() {
  try {
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

    // Obtener todos los roles
    const { data: roles, error: rolesError } = await supabase
      .from('roles')
      .select('id, name, level, description')
      .order('level', { ascending: false })

    if (rolesError) {
      return NextResponse.json({ 
        error: 'Error al obtener roles',
        details: rolesError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ roles: roles || [] })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

