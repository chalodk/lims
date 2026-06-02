import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'

// DELETE: Eliminar vínculo entre usuario y cliente
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; clientId: string }> }
) {
  try {
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

    const roleData = currentUser.roles as { id: number; name: string } | { id: number; name: string }[]
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const { id, clientId } = await params
    const userId = id

    // Verificar que el vínculo existe en user_clients
    const { data: existingLink, error: checkError } = await supabase
      .from('user_clients')
      .select('id')
      .eq('user_id', userId)
      .eq('client_id', clientId)
      .maybeSingle()

    if (checkError) {
      return NextResponse.json({ error: 'Error al verificar vínculo' }, { status: 500 })
    }

    if (!existingLink) {
      return NextResponse.json({ error: 'El cliente no está vinculado a este usuario' }, { status: 400 })
    }

    // Eliminar el vínculo de user_clients
    const { error: deleteError } = await supabase
      .from('user_clients')
      .delete()
      .eq('user_id', userId)
      .eq('client_id', clientId)

    if (deleteError) {
      return NextResponse.json({
        error: 'Error al eliminar vínculo',
        details: deleteError.message
      }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

