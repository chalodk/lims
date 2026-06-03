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

    // Obtener vínculos desde la tabla user_clients
    const { data: links, error: linkedError } = await supabase
      .from('user_clients')
      .select('id, client_id, created_at')
      .eq('user_id', userId)

    if (linkedError) {
      console.error('Error querying user_clients:', linkedError)
      return NextResponse.json({
        error: 'Error al obtener vínculos',
        details: linkedError.message,
        code: linkedError.code
      }, { status: 500 })
    }

    // Resolver datos de clientes en consulta separada
    const clientIds = (links || []).map(l => l.client_id)
    const clientsMap: Record<string, { id: string; name: string; rut: string | null; contact_email: string | null }> = {}
    if (clientIds.length > 0) {
      const { data: clientsData } = await supabase
        .from('clients')
        .select('id, name, rut, contact_email')
        .in('id', clientIds)
      if (clientsData) {
        for (const c of clientsData) {
          clientsMap[c.id] = c
        }
      }
    }

    const formattedClients = (links || []).map(link => ({
      id: link.id,
      client_id: link.client_id,
      clients: clientsMap[link.client_id] || null
    }))

    return NextResponse.json({ clients: formattedClients })
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
      .select('role_id, roles(name)')
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

    // Insertar vínculo en la tabla user_clients
    const { error: insertError } = await supabase
      .from('user_clients')
      .insert({
        user_id: userId,
        client_id: client_id,
        created_at: new Date().toISOString(),
        created_by: user.id
      })

    if (insertError) {
      if (insertError.code === '23505') {
        return NextResponse.json({
          error: 'El cliente ya está vinculado a este usuario'
        }, { status: 409 })
      }
      return NextResponse.json({
        error: 'Error al vincular cliente',
        details: insertError.message
      }, { status: 500 })
    }

    return NextResponse.json({
      client: clientData
    }, { status: 200 })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

