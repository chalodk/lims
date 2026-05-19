import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SLAService } from '@/lib/services/slaService'

async function getAuthAndCompany(request: NextRequest) {
  const supabase = await createClient()
  const { data: { user }, error: authError } = await supabase.auth.getUser()

  if (authError || !user) {
    return { supabase, user: null, companyId: null }
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  return { supabase, user, companyId: userData?.company_id || null }
}

export async function POST(request: NextRequest) {
  try {
    const { supabase, user, companyId } = await getAuthAndCompany(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const body = await request.json()
    const { sample_id } = body

    const slaService = new SLAService(supabase)

    if (sample_id) {
      // Verify the sample belongs to user's company before updating
      if (companyId) {
        const { data: sample } = await supabase
          .from('samples')
          .select('company_id')
          .eq('id', sample_id)
          .single()

        if (!sample || sample.company_id !== companyId) {
          return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })
        }
      }

      const success = await slaService.updateSampleSLAStatus(sample_id)

      if (success) {
        return NextResponse.json({
          message: 'SLA status updated successfully',
          sample_id
        })
      } else {
        return NextResponse.json(
          { error: 'Failed to update SLA status' },
          { status: 500 }
        )
      }
    } else {
      const result = await slaService.updateAllSLAStatuses()

      return NextResponse.json({
        message: 'SLA status update completed',
        updated: result.updated,
        errors: result.errors
      })
    }
  } catch (error) {
    console.error('Error updating SLA status:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const { supabase, user, companyId } = await getAuthAndCompany(request)

    if (!user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const slaService = new SLAService(supabase)
    const stats = await slaService.getSLAStats(companyId)
    const samplesNeedingAttention = await slaService.getSamplesNeedingAttention(companyId)

    return NextResponse.json({
      stats,
      attention: samplesNeedingAttention
    })
  } catch (error) {
    console.error('Error fetching SLA information:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
