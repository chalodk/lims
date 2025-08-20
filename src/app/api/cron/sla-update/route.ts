import { NextRequest, NextResponse } from 'next/server'
import { SLAService } from '@/lib/services/slaService'

export async function POST(request: NextRequest) {
  try {
    // Verify this is a legitimate cron request
    const authHeader = request.headers.get('authorization')
    const cronSecret = process.env.CRON_SECRET

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    console.log('Starting daily SLA status update...')
    
    const slaService = new SLAService()
    const result = await slaService.updateAllSLAStatuses()
    
    console.log(`SLA update completed: ${result.updated} updated, ${result.errors} errors`)

    // Log the results for monitoring
    const logMessage = {
      timestamp: new Date().toISOString(),
      updated: result.updated,
      errors: result.errors,
      status: result.errors > 0 ? 'partial_success' : 'success'
    }

    return NextResponse.json({
      message: 'SLA update completed successfully',
      ...logMessage
    })
  } catch (error) {
    console.error('Error in SLA cron job:', error)
    
    return NextResponse.json(
      { 
        error: 'SLA update failed',
        timestamp: new Date().toISOString(),
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    )
  }
}

// Optional: Also allow GET for manual testing
export async function GET(request: NextRequest) {
  const authHeader = request.headers.get('authorization')
  const cronSecret = process.env.CRON_SECRET

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const slaService = new SLAService()
  const stats = await slaService.getSLAStats()
  const samplesNeedingAttention = await slaService.getSamplesNeedingAttention()

  return NextResponse.json({
    message: 'SLA status check',
    timestamp: new Date().toISOString(),
    stats,
    attention: samplesNeedingAttention
  })
}