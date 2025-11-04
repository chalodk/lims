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

    // Verificar que el usuario tiene este cliente vinculado
    const { data: userData, error: checkError } = await supabase
      .from('users')
      .select('client_id')
      .eq('id', userId)
      .single()

    if (checkError || !userData) {
      return NextResponse.json({ error: 'Usuario no encontrado' }, { status: 404 })
    }

    if (userData.client_id !== clientId) {
      return NextResponse.json({ error: 'El cliente no está vinculado a este usuario' }, { status: 400 })
    }

    // Eliminar el vínculo actualizando client_id a null
    const { error: updateError } = await supabase
      .from('users')
      .update({ client_id: null })
      .eq('id', userId)

    if (updateError) {
      return NextResponse.json({ 
        error: 'Error al eliminar vínculo',
        details: updateError.message 
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

