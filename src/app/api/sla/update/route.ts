import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { SLAService } from '@/lib/services/slaService'

export const POST = withAuth(async (request, { user, supabase }) => {
  try {
    const body = await request.json()
    const { sample_id } = body

    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id
    const slaService = new SLAService(supabase)

    if (sample_id) {
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
        return NextResponse.json({ message: 'SLA status updated successfully', sample_id })
      } else {
        return NextResponse.json({ error: 'Failed to update SLA status' }, { status: 500 })
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
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    if (!userData?.company_id) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const slaService = new SLAService(supabase)
    const stats = await slaService.getSLAStats(userData.company_id)
    const samplesNeedingAttention = await slaService.getSamplesNeedingAttention(userData.company_id)

    return NextResponse.json({ stats, attention: samplesNeedingAttention })
  } catch (error) {
    console.error('Error fetching SLA information:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})
