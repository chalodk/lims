import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * PATCH /api/auth/user
 * Permite al usuario autenticado actualizar su propio perfil:
 * - Nombre en public.users
 * - Contraseña en auth.users (si se proporciona)
 */
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    // Validar que al menos se esté actualizando algo
    if (!name && !newPassword) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un campo para actualizar' },
        { status: 400 }
      )
    }

    // Si se está cambiando la contraseña, validar campos requeridos
    if (newPassword) {
      if (!currentPassword) {
        return NextResponse.json(
          { error: 'Debes proporcionar tu contraseña actual para cambiarla' },
          { status: 400 }
        )
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: 'La nueva contraseña debe tener al menos 6 caracteres' },
          { status: 400 }
        )
      }
    }

    // Actualizar nombre en public.users si se proporciona
    if (name !== undefined) {
      // Verificar si el usuario existe en public.users
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 es "no rows returned", cualquier otro error es un problema real
        console.error('Error al verificar usuario:', fetchError)
        return NextResponse.json(
          { error: 'Error al verificar usuario' },
          { status: 500 }
        )
      }

      if (existingUser) {
        // Usuario existe, actualizar nombre
        const { error: updateError } = await supabase
          .from('users')
          .update({
            name: name.trim(),
            updated_at: new Date().toISOString()
          })
          .eq('id', user.id)

        if (updateError) {
          console.error('Error al actualizar nombre:', updateError)
          return NextResponse.json(
            { error: 'Error al actualizar nombre' },
            { status: 500 }
          )
        }
      } else {
        // Usuario no existe en public.users, crearlo
        const { error: createError } = await supabase
          .from('users')
          .insert({
            id: user.id,
            name: name.trim(),
            email: user.email || '',
            created_at: new Date().toISOString()
          })

        if (createError) {
          console.error('Error al crear perfil:', createError)
          return NextResponse.json(
            { error: 'Error al crear perfil de usuario' },
            { status: 500 }
          )
        }
      }
    }

    // Actualizar contraseña si se proporciona
    if (newPassword && currentPassword) {
      // Verificar contraseña actual antes de cambiarla
      // Usar el cliente admin para verificar la contraseña sin afectar la sesión del usuario
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

      // Intentar hacer sign in con un cliente temporal para validar la contraseña
      // Esto no afectará la sesión del usuario porque usamos un cliente admin separado
      const tempClient = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
        {
          auth: {
            autoRefreshToken: false,
            persistSession: false
          }
        }
      )

      const { error: signInError } = await tempClient.auth.signInWithPassword({
        email: user.email!,
        password: currentPassword
      })

      if (signInError) {
        return NextResponse.json(
          { error: 'La contraseña actual es incorrecta' },
          { status: 401 }
        )
      }

      // Si la contraseña actual es correcta, actualizar a la nueva
      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        {
          password: newPassword
        }
      )

      if (updatePasswordError) {
        console.error('Error al actualizar contraseña:', updatePasswordError)
        return NextResponse.json(
          { error: 'Error al actualizar contraseña' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({
      message: 'Cuenta actualizada exitosamente'
    })
  } catch (error) {
    console.error('Error en PATCH /api/auth/user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
