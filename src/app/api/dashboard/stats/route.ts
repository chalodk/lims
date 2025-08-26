import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function GET() {
  try {
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

    const companyId = userData?.company_id

    // Query for sample statistics
    const { data: sampleStats, error: samplesError } = await supabase
      .from('samples')
      .select('status')
      .eq(companyId ? 'company_id' : 'id', companyId || user.id)

    if (samplesError) {
      console.error('Error fetching sample stats:', samplesError)
    }

    // Query for results statistics
    const { data: resultStats, error: resultsError } = await supabase
      .from('results')
      .select(`
        status,
        samples!inner (
          ${companyId ? 'company_id' : 'id'}
        )
      `)
      .eq(companyId ? 'samples.company_id' : 'samples.id', companyId || user.id)

    if (resultsError) {
      console.error('Error fetching result stats:', resultsError)
    }

    // Query for reports statistics
    const { data: reportStats, error: reportsError } = await supabase
      .from('reports')
      .select('status')
      .eq(companyId ? 'company_id' : 'client_id', companyId || user.id)

    if (reportsError) {
      console.error('Error fetching report stats:', reportsError)
    }

    // Process sample statistics
    const sampleCounts = {
      total: sampleStats?.length || 0,
      received: sampleStats?.filter(s => s.status === 'received').length || 0,
      processing: sampleStats?.filter(s => ['processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis'].includes(s.status)).length || 0,
      validation: sampleStats?.filter(s => s.status === 'validation').length || 0,
      completed: sampleStats?.filter(s => s.status === 'completed').length || 0
    }

    // Process result statistics
    const resultCounts = {
      total: resultStats?.length || 0,
      pending: resultStats?.filter(r => r.status === 'pending').length || 0,
      completed: resultStats?.filter(r => r.status === 'completed').length || 0,
      validated: resultStats?.filter(r => r.status === 'validated').length || 0
    }

    // Process report statistics
    const reportCounts = {
      total: reportStats?.length || 0,
      draft: reportStats?.filter(r => r.status === 'draft').length || 0,
      generated: reportStats?.filter(r => r.status === 'generated').length || 0,
      sent: reportStats?.filter(r => r.status === 'sent').length || 0
    }

    // Calculate derived statistics
    const activeSamples = sampleCounts.received + sampleCounts.processing + sampleCounts.validation
    const pendingWork = resultCounts.pending + sampleCounts.processing + sampleCounts.validation
    const completedWork = resultCounts.completed + resultCounts.validated

    return NextResponse.json({
      samples: sampleCounts,
      results: resultCounts,
      reports: reportCounts,
      overview: {
        activeSamples,
        pendingWork,
        completedWork,
        totalReports: reportCounts.total
      }
    })
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}