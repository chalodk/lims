import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function PATCH(
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

    // Obtener datos del body (solo name y role_id, el email no se puede editar)
    const body = await request.json()
    const { name, role_id } = body

    // Verificar que el usuario a editar no sea admin (protección)
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role_id, roles(name)')
      .eq('id', userId)
      .single()

    if (targetError && targetError.code !== 'PGRST116') {
      // PGRST116 es "no rows returned", significa que el usuario no existe en public.users
      // En ese caso, es un usuario no autorizado y podemos crear su perfil
    } else if (targetUser) {
      // Verificar si el usuario objetivo es admin
      const targetRoleData = targetUser.roles as RoleData
      const targetRole = Array.isArray(targetRoleData) 
        ? targetRoleData[0]?.name 
        : targetRoleData?.name

      if (targetRole === 'admin') {
        return NextResponse.json({ error: 'No se puede editar un administrador' }, { status: 403 })
      }
    }

    // Obtener el email actual del usuario para crear perfil si no existe
    let currentEmail: string | null = null
    if (targetError && targetError.code === 'PGRST116') {
      // Si el usuario no existe, obtener el email desde auth.users
      try {
        const supabaseAdmin = createAdminClient(
          process.env.NEXT_PUBLIC_SUPABASE_URL!,
          process.env.SUPABASE_SERVICE_ROLE_KEY!,
          {
            auth: {
              autoRefreshToken: false,
              persistSession: false
            }
          }
        )
        const { data: authUser } = await supabaseAdmin.auth.admin.getUserById(userId)
        currentEmail = authUser?.user?.email || null
      } catch (err) {
        console.error('Error al obtener email desde auth:', err)
      }
    } else if (targetUser) {
      // Si el usuario existe, obtener su email actual
      const { data: userData } = await supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single()
      currentEmail = userData?.email || null
    }

    // Si role_id es null, significa que se quiere quitar el rol
    // Pero si es un usuario no autorizado, debemos crear el perfil primero
    interface UpdateData {
      name?: string
      role_id?: number | null
    }
    const updateData: UpdateData = {}
    if (name !== undefined) updateData.name = name
    // NO incluir email en updateData - el email no se puede editar
    if (role_id !== undefined) updateData.role_id = role_id

    // Si el usuario no existe en public.users, crearlo
    if (targetError && targetError.code === 'PGRST116') {
      // Usuario no autorizado - crear perfil con el email actual (no el que viene del body)
      const { data: newUser, error: createError } = await supabase
        .from('users')
        .insert({
          id: userId,
          name: name || '',
          email: currentEmail || '',
          role_id: role_id || null,
          created_at: new Date().toISOString()
        })
        .select()
        .single()

      if (createError) {
        console.error('Error al crear perfil:', createError)
        return NextResponse.json({ 
          error: 'Error al crear perfil de usuario',
          details: createError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Perfil creado exitosamente',
        user: newUser 
      })
    } else {
      // Usuario existe - actualizar (solo name y role_id, NO email)
      const { data: updatedUser, error: updateError } = await supabase
        .from('users')
        .update({
          ...updateData,
          updated_at: new Date().toISOString()
        })
        .eq('id', userId)
        .select()
        .single()

      if (updateError) {
        console.error('Error al actualizar usuario:', updateError)
        return NextResponse.json({ 
          error: 'Error al actualizar usuario',
          details: updateError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Perfil actualizado exitosamente',
        user: updatedUser 
      })
    }
  } catch (error) {
    console.error('Error en PATCH /api/settings/users/[id]:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function DELETE(
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

    // No permitir auto-eliminación
    if (userId === user.id) {
      return NextResponse.json({ error: 'No puedes eliminar tu propio perfil' }, { status: 403 })
    }

    // Verificar que el usuario a eliminar existe y obtener su rol
    const { data: targetUser, error: targetError } = await supabase
      .from('users')
      .select('id, role_id, roles(name)')
      .eq('id', userId)
      .single()

    if (targetError && targetError.code === 'PGRST116') {
      // Usuario no existe en public.users, pero puede existir en auth.users
      // Eliminar solo de auth.users
      const supabaseAdmin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)
      
      if (deleteAuthError) {
        console.error('Error al eliminar usuario de auth:', deleteAuthError)
        return NextResponse.json({ 
          error: 'Error al eliminar usuario',
          details: deleteAuthError.message 
        }, { status: 500 })
      }

      return NextResponse.json({ 
        message: 'Usuario eliminado exitosamente'
      })
    }

    if (targetError) {
      return NextResponse.json({ 
        error: 'Error al obtener información del usuario',
        details: targetError.message 
      }, { status: 500 })
    }

    if (!targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    // Verificar que no se está eliminando a un admin
    const targetRoleData = targetUser.roles as RoleData
    const targetRole = Array.isArray(targetRoleData) 
      ? targetRoleData[0]?.name 
      : targetRoleData?.name

    if (targetRole === 'admin') {
      return NextResponse.json({ error: 'No se puede eliminar un administrador' }, { status: 403 })
    }

    // Crear cliente admin para eliminar de auth.users
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Eliminar el perfil de la tabla users primero
    const { error: deleteProfileError } = await supabase
      .from('users')
      .delete()
      .eq('id', userId)

    if (deleteProfileError) {
      console.error('Error al eliminar perfil:', deleteProfileError)
      return NextResponse.json({ 
        error: 'Error al eliminar perfil de usuario',
        details: deleteProfileError.message 
      }, { status: 500 })
    }

    // Eliminar el usuario de auth.users
    const { error: deleteAuthError } = await supabaseAdmin.auth.admin.deleteUser(userId)

    if (deleteAuthError) {
      console.error('Error al eliminar usuario de auth:', deleteAuthError)
      // Intentar recrear el perfil si falla la eliminación de auth
      // (Rollback parcial)
      console.warn('No se pudo eliminar de auth.users, pero el perfil fue eliminado')
    }

    return NextResponse.json({ 
      message: 'Usuario eliminado exitosamente'
    })
  } catch (error) {
    console.error('Error en DELETE /api/settings/users/[id]:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

