import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const PATCH = withAuth(async (request, { user, supabase }) => {
  try {
    const body = await request.json()
    const { name, currentPassword, newPassword } = body

    if (!name && !newPassword) {
      return NextResponse.json(
        { error: 'Debes proporcionar al menos un campo para actualizar' },
        { status: 400 }
      )
    }

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
      const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id')
        .eq('id', user.id)
        .single()

      if (fetchError && fetchError.code !== 'PGRST116') {
        console.error('Error al verificar usuario:', fetchError)
        return NextResponse.json(
          { error: 'Error al verificar usuario' },
          { status: 500 }
        )
      }

      if (existingUser) {
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

      const { error: updatePasswordError } = await supabaseAdmin.auth.admin.updateUserById(
        user.id,
        { password: newPassword }
      )

      if (updatePasswordError) {
        console.error('Error al actualizar contraseña:', updatePasswordError)
        return NextResponse.json(
          { error: 'Error al actualizar contraseña' },
          { status: 500 }
        )
      }
    }

    return NextResponse.json({ message: 'Cuenta actualizada exitosamente' })
  } catch (error) {
    console.error('Error en PATCH /api/auth/user:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
