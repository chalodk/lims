import { withAuth } from '@/lib/auth/api-auth'
import { NextResponse } from 'next/server'
import {
  createUserAtomically,
  linkExistingUserToClient,
  checkEmailExistsInAuth,
  checkEmailExistsInPublicUsers,
  type CreateUserOptions
} from '@/lib/services/userCreationService'

/**
 * PUT /api/clients/[id]
 * Actualiza un cliente y, si se agregó un contact_email nuevo, crea/víncula usuario consumidor
 */
export const PUT = withAuth(async (request, { user, supabase }) => {
  try {
    const clientId = request.nextUrl.pathname.split('/').pop()!

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser || !currentUser.company_id) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const body = await request.json()
    const { name, rut, contact_email, phone, address, client_type, observation } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre del cliente es requerido' }, { status: 400 })
    }

    // Obtener el cliente actual para saber si el contact_email cambió
    const { data: existingClient, error: fetchError } = await supabase
      .from('clients')
      .select('contact_email')
      .eq('id', clientId)
      .eq('company_id', currentUser.company_id)
      .single()

    if (fetchError || !existingClient) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    const newEmail = contact_email?.trim() || null
    const previousEmail = existingClient.contact_email

    // Actualizar cliente
    const { data: updatedClient, error: updateError } = await supabase
      .from('clients')
      .update({
        name: name.trim(),
        rut: rut?.trim() || null,
        contact_email: newEmail,
        phone: phone?.trim() || null,
        address: address?.trim() || null,
        client_type: client_type || 'farmer',
        observation: observation || false
      })
      .eq('id', clientId)
      .eq('company_id', currentUser.company_id)
      .select()
      .single()

    if (updateError) {
      return NextResponse.json({
        error: 'Error al actualizar cliente',
        details: updateError.message
      }, { status: 500 })
    }

    // Si no hay email nuevo o no cambió, retornar sin crear usuario
    if (!newEmail || newEmail === previousEmail) {
      return NextResponse.json({
        message: 'Cliente actualizado exitosamente',
        client: updatedClient
      })
    }

    // El email cambió o se agregó por primera vez → crear/vincular usuario
    const authCheck = await checkEmailExistsInAuth(newEmail)
    const publicCheck = await checkEmailExistsInPublicUsers(newEmail)

    if (authCheck.exists || publicCheck.exists) {
      const userId = authCheck.userId || publicCheck.userId

      if (userId) {
        if (!publicCheck.clientIds.includes(clientId)) {
          const linkResult = await linkExistingUserToClient(userId, clientId)

          if (linkResult.success) {
            return NextResponse.json({
              message: 'Cliente actualizado y usuario vinculado exitosamente',
              client: updatedClient,
              warning: 'El email ya existía en el sistema y fue vinculado al cliente'
            })
          } else {
            return NextResponse.json({
              client: updatedClient,
              warning: `Cliente actualizado pero no se pudo vincular usuario: ${linkResult.error}`
            })
          }
        } else {
          return NextResponse.json({
            message: 'Cliente actualizado exitosamente',
            client: updatedClient,
            warning: 'El email ya está asociado a este cliente'
          })
        }
      } else {
        return NextResponse.json({
          client: updatedClient,
          warning: 'Cliente actualizado pero el email ya existe en el sistema'
        })
      }
    }

    // Email no existe — crear nuevo usuario consumidor
    const createUserOptions: CreateUserOptions = {
      email: newEmail,
      name: name.trim(),
      rut: rut?.trim() || '',
      companyId: currentUser.company_id,
      clientId,
      roleName: 'consumidor',
      webhookOrigen: 1
    }

    const createResult = await createUserAtomically(createUserOptions)

    if (createResult.success) {
      return NextResponse.json({
        message: 'Cliente actualizado y usuario consumidor creado exitosamente',
        client: updatedClient,
        warning: createResult.warning,
        password: createResult.password
      })
    } else {
      return NextResponse.json({
        client: updatedClient,
        warning: `Cliente actualizado pero no se pudo crear usuario: ${createResult.error}`
      })
    }
  } catch (error) {
    console.error('Error en PUT /api/clients:', error)
    return NextResponse.json({
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
})
