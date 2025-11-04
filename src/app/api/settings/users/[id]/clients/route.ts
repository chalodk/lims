import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// GET: Obtener clientes vinculados a un usuario
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es admin
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const roleData = currentUser.roles as { id: number; name: string } | { id: number; name: string }[]
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await params
    const userId = id

    // Obtener el usuario con su cliente vinculado
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select(`
        id,
        client_id,
        clients (
          id,
          name,
          rut,
          contact_email
        )
      `)
      .eq('id', userId)
      .single()

    if (userDataError) {
      return NextResponse.json({ 
        error: 'Error al obtener usuario',
        details: userDataError.message 
      }, { status: 500 })
    }

    // Formatear respuesta para mantener compatibilidad
    // Manejar tanto array como objeto para la relación clients
    const clientData = userData.clients
      ? (Array.isArray(userData.clients) ? userData.clients[0] : userData.clients)
      : null
    
    const clients = userData.client_id && clientData
      ? [{
          id: clientData.id,
          client_id: userData.client_id,
          clients: clientData
        }]
      : []

    return NextResponse.json({ clients })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

// POST: Vincular un cliente a un usuario
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es admin
    const { data: currentUser, error: currentUserError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (currentUserError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    const roleData = currentUser.roles as { id: number; name: string } | { id: number; name: string }[]
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id } = await params
    const userId = id
    const { client_id } = await request.json()

    if (!client_id) {
      return NextResponse.json({ error: 'client_id es requerido' }, { status: 400 })
    }

    // Verificar que el usuario tiene rol consumidor
    const { data: targetUser, error: targetUserError } = await supabase
      .from('users')
      .select('role_id, roles(name), client_id')
      .eq('id', userId)
      .single()

    if (targetUserError || !targetUser) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    const targetRoleData = targetUser.roles as { id: number; name: string } | { id: number; name: string }[]
    const targetRole = Array.isArray(targetRoleData) 
      ? targetRoleData[0]?.name 
      : targetRoleData?.name

    if (targetRole !== 'consumidor') {
      return NextResponse.json({ error: 'Solo se pueden vincular clientes a usuarios con rol consumidor' }, { status: 400 })
    }

    // Verificar que el cliente existe
    const { data: clientData, error: clientError } = await supabase
      .from('clients')
      .select('id, name, rut, contact_email')
      .eq('id', client_id)
      .single()

    if (clientError || !clientData) {
      return NextResponse.json({ error: 'Cliente no encontrado' }, { status: 404 })
    }

    // Actualizar el campo client_id directamente en la tabla users
    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ client_id: client_id })
      .eq('id', userId)
      .select(`
        id,
        client_id,
        clients (
          id,
          name,
          rut,
          contact_email
        )
      `)
      .single()

    if (updateError) {
      return NextResponse.json({ 
        error: 'Error al vincular cliente',
        details: updateError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      user: updatedUser,
      client: clientData
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

