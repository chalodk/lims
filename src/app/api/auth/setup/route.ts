import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const POST = withAuth(async (request, { user, supabase }) => {
  try {
    const body = await request.json()
    const { name, company_name, specialization, role } = body

    if (!name || !name.trim()) {
      return NextResponse.json({ error: 'El nombre es requerido' }, { status: 400 })
    }

    // Look up role ID
    const { data: roleData, error: roleError } = await supabase
      .from('roles')
      .select('id')
      .eq('name', role || 'comun')
      .single()

    if (roleError || !roleData) {
      return NextResponse.json({ error: 'Rol no encontrado' }, { status: 400 })
    }

    // Create user profile with forced company_id
    const forcedCompanyId = '97efa8ef-de43-491c-9c9f-bdd21a7dbb17'

    const { error: userError } = await supabase
      .from('users')
      .insert({
        id: user.id,
        company_id: forcedCompanyId,
        role_id: roleData.id,
        name: name.trim(),
        email: user.email || '',
        specialization: specialization?.trim() || null,
      })

    if (userError) {
      console.error('Error creating user profile:', userError)
      return NextResponse.json({ error: 'Error al crear perfil de usuario' }, { status: 500 })
    }

    // Log the action
    await supabase.rpc('log_action', {
      action_text: 'User profile created',
      target_table_name: 'users',
      target_record_id: user.id,
      metadata_json: {
        company_name: company_name || '',
        role: role || 'comun',
      },
    })

    return NextResponse.json({ message: 'Perfil creado exitosamente' })
  } catch (error) {
    console.error('Error en POST /api/auth/setup:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})
