import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

/**
 * Función helper para limpiar el RUT: quitar puntos y dígito verificador
 * Ejemplo: "12.345.678-9" -> "12345678"
 * Ejemplo: "12.345.678-K" -> "12345678"
 */
function cleanRut(rut: string): string {
  // Quitar puntos y guiones
  let cleaned = rut.replace(/\./g, '').replace(/-/g, '').trim()
  // Quitar el último carácter (dígito verificador)
  if (cleaned.length > 0) {
    cleaned = cleaned.slice(0, -1)
  }
  return cleaned
}

/**
 * POST /api/clients
 * Crea un nuevo cliente y opcionalmente un usuario consumidor asociado
 */
export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Obtener datos del usuario actual para obtener company_id
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    if (!currentUser.company_id) {
      return NextResponse.json({ error: 'Usuario no tiene company_id asignado' }, { status: 400 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { name, rut, contact_email, phone, address, client_type, observation } = body

    // Validaciones
    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 })
    }

    if (!rut || !rut.trim()) {
      return NextResponse.json({ error: 'El RUT del cliente es requerido' }, { status: 400 })
    }

    // Crear el cliente
    const { data: newClient, error: createClientError } = await supabase
      .from('clients')
      .insert({
        name: name.trim(),
        rut: rut.trim(),
        contact_email: contact_email?.trim() || null,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        client_type: client_type || 'farmer',
        observation: observation || false,
        company_id: currentUser.company_id
      })
      .select()
      .single()

    if (createClientError) {
      console.error('Error al crear cliente:', createClientError)
      return NextResponse.json({ 
        error: 'Error al crear cliente',
        details: createClientError.message 
      }, { status: 500 })
    }

    // Si hay email de contacto, crear usuario consumidor automáticamente
    if (contact_email && contact_email.trim()) {
      try {
        console.log(`🔍 Iniciando creación de usuario consumidor para email: ${contact_email.trim()}`)
        
        // Crear cliente admin para operaciones de auth
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

        // Verificar si el email ya existe en auth.users
        // Usar listUsers y filtrar por email, ya que getUserByEmail puede no estar disponible
        let emailExists = false
        try {
          const { data: authUsersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
          if (!listError && authUsersList?.users) {
            emailExists = authUsersList.users.some(u => u.email === contact_email.trim())
          }
        } catch (checkError) {
          console.warn('Error al verificar si email existe:', checkError)
          // Continuar intentando crear el usuario
        }
        
        if (emailExists) {
          // Email ya existe, omitir creación de usuario pero continuar
          console.log(`⚠️ Email ${contact_email.trim()} ya existe en auth.users, omitiendo creación de usuario`)
        } else {
          console.log(`📋 Email no existe, procediendo con creación de usuario`)
          
          // Obtener el role_id del rol "consumidor"
          console.log(`🔍 Obteniendo role_id del rol "consumidor"`)
          const { data: consumidorRole, error: roleError } = await supabase
            .from('roles')
            .select('id')
            .eq('name', 'consumidor')
            .single()

          if (roleError || !consumidorRole) {
            console.error('❌ Error al obtener role_id de consumidor:', roleError)
            return NextResponse.json({ 
              client: newClient,
              warning: `Cliente creado pero no se pudo crear usuario consumidor (rol no encontrado: ${roleError?.message || 'Error desconocido'})`
            }, { status: 201 })
          }

          console.log(`✅ Role_id de consumidor obtenido: ${consumidorRole.id}`)

          // Limpiar el RUT para usarlo como contraseña
          const password = cleanRut(rut.trim())
          console.log(`🔐 Contraseña generada desde RUT (longitud: ${password.length})`)

          if (password.length < 6) {
            console.error('❌ La contraseña generada es muy corta (mínimo 6 caracteres)')
            return NextResponse.json({ 
              client: newClient,
              warning: 'Cliente creado pero no se pudo crear usuario consumidor (RUT muy corto para generar contraseña válida)'
            }, { status: 201 })
          }

          // Crear usuario en auth.users
          console.log(`👤 Creando usuario en auth.users...`)
          const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
            email: contact_email.trim(),
            password: password,
            email_confirm: true,
            user_metadata: {
              name: name.trim()
            }
          })

          if (createAuthError || !authUser.user) {
            console.error('❌ Error al crear usuario en auth.users:', createAuthError)
            return NextResponse.json({ 
              client: newClient,
              warning: `Cliente creado pero no se pudo crear usuario consumidor: ${createAuthError?.message || 'Error desconocido'}`
            }, { status: 201 })
          }

          console.log(`✅ Usuario creado en auth.users con ID: ${authUser.user.id}`)

          // Crear perfil en public.users
          console.log(`📝 Creando perfil en public.users...`)
          const { data: newUser, error: createProfileError } = await supabase
            .from('users')
            .insert({
              id: authUser.user.id,
              name: name.trim(),
              email: contact_email.trim(),
              role_id: consumidorRole.id,
              company_id: currentUser.company_id,
              client_id: newClient.id,
              created_at: new Date().toISOString()
            })
            .select()
            .single()

          if (createProfileError) {
            console.error('❌ Error al crear perfil de usuario:', createProfileError)
            // Si falla la creación del perfil, eliminar el usuario de auth
            try {
              await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
              console.log(`🗑️ Usuario eliminado de auth.users debido a error en perfil`)
            } catch (deleteError) {
              console.error('Error al eliminar usuario de auth después de fallo:', deleteError)
            }
            return NextResponse.json({ 
              client: newClient,
              warning: `Cliente creado pero no se pudo crear usuario consumidor (error al crear perfil: ${createProfileError.message})`
            }, { status: 201 })
          }

          console.log(`✅ Usuario consumidor creado exitosamente para cliente ${newClient.id} (user_id: ${newUser.id})`)
        }
      } catch (userCreationError) {
        console.error('❌ Error en proceso de creación de usuario:', userCreationError)
        const errorMessage = userCreationError instanceof Error ? userCreationError.message : 'Error desconocido'
        return NextResponse.json({ 
          client: newClient,
          warning: `Cliente creado pero hubo un error al crear usuario consumidor: ${errorMessage}`
        }, { status: 201 })
      }
    }

    return NextResponse.json({ 
      message: 'Cliente creado exitosamente',
      client: newClient 
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/clients:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

