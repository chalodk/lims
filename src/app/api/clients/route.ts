import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { 
  createUserAtomically, 
  linkExistingUserToClient,
  checkEmailExistsInAuth,
  checkEmailExistsInPublicUsers,
  type CreateUserOptions 
} from '@/lib/services/userCreationService'

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
        
        // Verificar si el email ya existe
        const authCheck = await checkEmailExistsInAuth(contact_email.trim())
        const publicCheck = await checkEmailExistsInPublicUsers(contact_email.trim())
        
        if (authCheck.exists || publicCheck.exists) {
          // Email ya existe - intentar vincular si es posible
          const userId = authCheck.userId || publicCheck.userId
          
          if (userId) {
            // Si el usuario existe pero no tiene client_id o es diferente, intentar vincular
            if (!publicCheck.clientId || publicCheck.clientId !== newClient.id) {
              const linkResult = await linkExistingUserToClient(userId, newClient.id)
              
              if (linkResult.success) {
                console.log(`✅ Usuario existente vinculado al cliente ${newClient.id}`)
                return NextResponse.json({ 
                  message: 'Cliente creado exitosamente',
                  client: newClient,
                  warning: 'El email ya existía en el sistema y fue vinculado al cliente'
                }, { status: 201 })
              } else {
                console.warn(`⚠️ No se pudo vincular usuario existente: ${linkResult.error}`)
                return NextResponse.json({ 
                  client: newClient,
                  warning: `Cliente creado pero el email ya existe y no se pudo vincular: ${linkResult.error}`
                }, { status: 201 })
              }
            } else {
              // Ya está vinculado al mismo cliente
              console.log(`ℹ️ Email ya está vinculado a este cliente`)
              return NextResponse.json({ 
                message: 'Cliente creado exitosamente',
                client: newClient,
                warning: 'El email ya está asociado a este cliente'
              }, { status: 201 })
            }
          } else {
            // Email existe pero no se pudo obtener userId
            console.warn(`⚠️ Email existe pero no se pudo obtener userId`)
            return NextResponse.json({ 
              client: newClient,
              warning: 'Cliente creado pero el email ya existe en el sistema'
            }, { status: 201 })
          }
        }
        
        // Email no existe - crear nuevo usuario
        console.log(`📋 Email no existe, procediendo con creación de usuario`)
        
        const createUserOptions: CreateUserOptions = {
          email: contact_email.trim(),
          name: name.trim(),
          rut: rut.trim(),
          companyId: currentUser.company_id,
          clientId: newClient.id,
          roleName: 'consumidor'
        }
        
        const createResult = await createUserAtomically(createUserOptions)
        
        if (createResult.success) {
          console.log(`✅ Usuario consumidor creado exitosamente para cliente ${newClient.id} (user_id: ${createResult.userId})`)
          
          return NextResponse.json({ 
            message: 'Cliente creado exitosamente',
            client: newClient,
            warning: createResult.warning
          }, { status: 201 })
        } else {
          // Error al crear usuario
          console.error(`❌ Error al crear usuario: ${createResult.error} (${createResult.errorCode})`)
          
          return NextResponse.json({ 
            client: newClient,
            warning: `Cliente creado pero no se pudo crear usuario consumidor: ${createResult.error}`
          }, { status: 201 })
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

