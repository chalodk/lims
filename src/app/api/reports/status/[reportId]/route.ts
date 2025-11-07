import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ reportId: string }> }
) {
  try {
    const { reportId } = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { status } = await request.json()

    // Validate input
    const validStatuses = ['draft', 'generated', 'sent', 'validated']
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: 'Invalid status' }, { status: 400 })
    }

    // Get user's role and company_id for security check
    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('company_id, role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userDataError || !userData) {
      console.error('Error fetching user data:', userDataError)
      return NextResponse.json({ 
        error: 'Error al obtener información del usuario',
        details: userDataError?.message 
      }, { status: 500 })
    }

    // Check if user has permission to validate reports (admin or validador)
    type RoleData = { id: number; name: string } | { id: number; name: string }[] | null
    const roleData = userData.roles as RoleData
    let role: string | null = null
    
    if (roleData) {
      role = Array.isArray(roleData) 
        ? roleData[0]?.name 
        : roleData?.name || null
    }

    console.log('User role check:', { role, role_id: userData.role_id, roles: userData.roles })

    if (!role || (role !== 'admin' && role !== 'validador')) {
      return NextResponse.json({ 
        error: 'No tienes permisos para validar informes. Solo usuarios con rol "admin" o "validador" pueden validar informes.',
        yourRole: role || 'sin rol asignado'
      }, { status: 403 })
    }

    // Check if the report exists and user has access
    const { data: existingReport, error: fetchError } = await supabase
      .from('reports')
      .select('id, company_id, status, completed')
      .eq('id', reportId)
      .single()

    if (fetchError || !existingReport) {
      return NextResponse.json({ error: 'Report not found' }, { status: 404 })
    }

    // Check company access (only if userData exists and has company_id)
    if (userData?.company_id && existingReport.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // We use 'completed' field to track validation instead of status
    // 'completed' = true means validated, 'completed' = false means draft (not validated)
    // Status remains as 'draft' to comply with database constraint
    
    const updateData: { completed: boolean; responsible_id: string | null; updated_at: string } = {
      completed: status === 'validated',
      responsible_id: status === 'validated' ? user.id : null,
      updated_at: new Date().toISOString()
    }

    // Only allow draft <-> validated transitions
    const isCurrentlyValidated = existingReport.completed === true
    if (!isCurrentlyValidated && status !== 'validated') {
      return NextResponse.json({ error: 'Can only validate draft reports' }, { status: 400 })
    }
    if (isCurrentlyValidated && status !== 'draft') {
      return NextResponse.json({ error: 'Can only unvalidate validated reports' }, { status: 400 })
    }

    // Update the report using completed field instead of status
    const { data: updatedReport, error: updateError } = await supabase
      .from('reports')
      .update(updateData)
      .eq('id', reportId)
      .select()
      .single()

    if (updateError) {
      console.error('Database error updating report status:', updateError)
      console.error('Error details:', {
        code: updateError.code,
        message: updateError.message,
        details: updateError.details,
        hint: updateError.hint
      })
      
      // Provide more helpful error message
      let errorMessage = updateError.message || 'Failed to update report status'
      if (updateError.message?.includes('check constraint') || updateError.message?.includes('invalid input value')) {
        errorMessage = 'El estado "validated" no está permitido en la base de datos. Por favor, actualiza el constraint CHECK de la tabla reports para incluir "validated".'
      }
      
      return NextResponse.json(
        { error: errorMessage, details: updateError.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      message: 'Report status updated successfully',
      report: updatedReport
    })
  } catch (error) {
    console.error('Error updating report status:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

