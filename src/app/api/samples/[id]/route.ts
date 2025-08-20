import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const { data, error } = await supabase
      .from('samples')
      .select(`
        *,
        clients (id, name, rut, contact_email),
        projects (id, name, code),
        sample_tests (
          id,
          test_catalog (id, code, name, area),
          methods (id, code, name, matrix)
        ),
        sample_units (
          id,
          code,
          label,
          unit_results (
            id,
            test_id,
            method_id,
            analyte,
            result_value,
            result_flag,
            notes,
            test_catalog (id, name, area),
            methods (id, name)
          )
        ),
        applied_interpretations (
          id,
          message,
          severity,
          created_at,
          interpretation_rules (id, area, analyte, message)
        ),
        reports (
          id,
          status,
          version,
          created_at,
          rendered_pdf_url,
          download_url,
          visibility
        )
      `)
      .eq('id', resolvedParams.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Check if user has access to this sample
    if (userData?.company_id && data.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error fetching sample:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    
    // Extract updatable fields
    const {
      client_id,
      code,
      received_date,
      sla_type,
      project_id,
      species,
      variety,
      planting_year,
      previous_crop,
      next_crop,
      fallow,
      client_notes,
      reception_notes,
      taken_by,
      delivery_method,
      suspected_pathogen,
      region,
      locality,
      sampling_observations,
      reception_observations,
      status
    } = body

    // First, get the current sample to check access and get current status
    const { data: currentSample, error: fetchError } = await supabase
      .from('samples')
      .select('status, company_id')
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    // Check access
    if (userData?.company_id && currentSample.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const updateData: Record<string, unknown> = {}

    // Only include fields that are provided
    if (client_id !== undefined) updateData.client_id = client_id
    if (code !== undefined) updateData.code = code
    if (received_date !== undefined) {
      updateData.received_date = received_date
      updateData.received_at = new Date(received_date).toISOString()
      
      // Recalculate due date if SLA type is also being updated or exists
      const slaType = sla_type || 'normal'
      const receivedAt = new Date(received_date)
      const dueDate = new Date(receivedAt)
      const businessDaysToAdd = slaType === 'express' ? 4 : 9
      
      let addedDays = 0
      while (addedDays < businessDaysToAdd) {
        dueDate.setDate(dueDate.getDate() + 1)
        if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6) {
          addedDays++
        }
      }
      
      updateData.due_date = dueDate.toISOString().split('T')[0]
    }
    if (sla_type !== undefined) updateData.sla_type = sla_type
    if (project_id !== undefined) updateData.project_id = project_id
    if (species !== undefined) updateData.species = species
    if (variety !== undefined) updateData.variety = variety
    if (planting_year !== undefined) updateData.planting_year = planting_year ? parseInt(planting_year) : null
    if (previous_crop !== undefined) updateData.previous_crop = previous_crop
    if (next_crop !== undefined) updateData.next_crop = next_crop
    if (fallow !== undefined) updateData.fallow = fallow
    if (client_notes !== undefined) updateData.client_notes = client_notes
    if (reception_notes !== undefined) updateData.reception_notes = reception_notes
    if (taken_by !== undefined) updateData.taken_by = taken_by
    if (delivery_method !== undefined) updateData.delivery_method = delivery_method
    if (suspected_pathogen !== undefined) updateData.suspected_pathogen = suspected_pathogen
    if (region !== undefined) updateData.region = region
    if (locality !== undefined) updateData.locality = locality
    if (sampling_observations !== undefined) updateData.sampling_observations = sampling_observations
    if (reception_observations !== undefined) updateData.reception_observations = reception_observations
    if (status !== undefined) updateData.status = status

    updateData.updated_at = new Date().toISOString()

    const { data, error } = await supabase
      .from('samples')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(`
        *,
        clients (id, name),
        projects (id, name)
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create status transition if status changed
    if (status && status !== currentSample.status) {
      await supabase
        .from('sample_status_transitions')
        .insert({
          sample_id: params.id,
          from_status: currentSample.status,
          to_status: status,
          by_user: user.id,
          reason: 'Status updated via API'
        })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating sample:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const body = await request.json()
    
    // Extract updatable fields - same as PUT but ensure required fields
    const {
      client_id,
      code,
      received_date,
      sla_type,
      project_id,
      species,
      variety,
      planting_year,
      previous_crop,
      next_crop,
      fallow,
      client_notes,
      reception_notes,
      taken_by,
      delivery_method,
      suspected_pathogen,
      region,
      locality,
      sampling_observations,
      reception_observations,
      status
    } = body

    if (!client_id || !code || !received_date || !species) {
      return NextResponse.json(
        { error: 'client_id, code, received_date, and species are required' },
        { status: 400 }
      )
    }

    // First, get the current sample to check access and get current status
    const { data: currentSample, error: fetchError } = await supabase
      .from('samples')
      .select('status, company_id')
      .eq('id', resolvedParams.id)
      .single()

    if (fetchError) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    // Check access
    if (userData?.company_id && currentSample.company_id !== userData.company_id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Calculate due date based on SLA
    const receivedAt = new Date(received_date)
    const dueDate = new Date(receivedAt)
    
    // Add business days based on SLA type
    const businessDaysToAdd = sla_type === 'express' ? 4 : 9
    let addedDays = 0
    
    while (addedDays < businessDaysToAdd) {
      dueDate.setDate(dueDate.getDate() + 1)
      // Skip weekends (0 = Sunday, 6 = Saturday)
      if (dueDate.getDay() !== 0 && dueDate.getDay() !== 6) {
        addedDays++
      }
    }

    const updateData = {
      client_id,
      code,
      received_date,
      received_at: new Date(received_date).toISOString(),
      sla_type: sla_type || 'normal',
      due_date: dueDate.toISOString().split('T')[0],
      project_id: project_id || null,
      species,
      variety: variety || null,
      planting_year: planting_year ? parseInt(planting_year) : null,
      previous_crop: previous_crop || null,
      next_crop: next_crop || null,
      fallow: fallow || false,
      client_notes: client_notes || null,
      reception_notes: reception_notes || null,
      taken_by: taken_by || 'client',
      delivery_method: delivery_method || null,
      suspected_pathogen: suspected_pathogen || null,
      region: region || null,
      locality: locality || null,
      sampling_observations: sampling_observations || null,
      reception_observations: reception_observations || null,
      status: status || 'received',
      updated_at: new Date().toISOString()
    }

    const { data, error } = await supabase
      .from('samples')
      .update(updateData)
      .eq('id', resolvedParams.id)
      .select(`
        *,
        clients (id, name),
        projects (id, name),
        sample_tests (
          id,
          test_catalog (id, name, area),
          methods (id, name)
        )
      `)
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Create status transition if status changed
    if (status && status !== currentSample.status) {
      await supabase
        .from('sample_status_transitions')
        .insert({
          sample_id: params.id,
          from_status: currentSample.status,
          to_status: status,
          by_user: user.id,
          reason: 'Status updated via PATCH API'
        })
    }

    return NextResponse.json(data)
  } catch (error) {
    console.error('Error updating sample:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}