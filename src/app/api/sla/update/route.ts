import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { SLAService } from '@/lib/services/slaService'

export async function POST(request: NextRequest) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Check if user is admin or has permission to run SLA updates
    // You might want to add a specific permission check here

    const body = await request.json()
    const { sample_id } = body

    const slaService = new SLAService()

    if (sample_id) {
      // Update specific sample
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
      // Update all samples
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
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET() {
  try {
    const slaService = new SLAService()
    const stats = await slaService.getSLAStats()
    const samplesNeedingAttention = await slaService.getSamplesNeedingAttention()

    return NextResponse.json({
      stats,
      attention: samplesNeedingAttention
    })
  } catch (error) {
    console.error('Error fetching SLA information:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}