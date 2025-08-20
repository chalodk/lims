import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportService } from '@/lib/reports/reportService'

export async function POST(
  request: NextRequest,
  { params }: { params: { sampleId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const { template_code, version } = body

    if (!template_code) {
      return NextResponse.json(
        { error: 'template_code is required' },
        { status: 400 }
      )
    }

    const reportService = new ReportService()
    
    // Check if user has access to this sample
    const sample = await reportService.getSampleData(params.sampleId)
    if (!sample) {
      return NextResponse.json({ error: 'Sample not found' }, { status: 404 })
    }

    // Generate the report
    const report = await reportService.renderReport(
      params.sampleId,
      template_code,
      version,
      user.id
    )

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error rendering report:', error)
    return NextResponse.json(
      { error: 'Failed to render report' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: { sampleId: string } }
) {
  try {
    const supabase = createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const reportService = new ReportService()
    const reports = await reportService.getReportsForSample(params.sampleId)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reports' },
      { status: 500 }
    )
  }
}