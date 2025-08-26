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
    let sampleStats: Array<{ status: string }> = []
    {
      const base = supabase.from('samples').select('status')
      const { data, error } = companyId
        ? await base.eq('company_id', companyId)
        : await base
      if (error) {
        console.error('Error fetching sample stats:', error)
      } else if (data) {
        sampleStats = data as Array<{ status: string }>
      }
    }

    // Query for results statistics
    let resultStats: Array<{ status: string }> = []
    {
      if (companyId) {
        const { data, error } = await supabase
          .from('results')
          .select('status, samples!inner(company_id)')
          .eq('samples.company_id', companyId)
        if (error) {
          console.error('Error fetching result stats:', error)
        } else if (data) {
          resultStats = data as Array<{ status: string }>
        }
      } else {
        const { data, error } = await supabase
          .from('results')
          .select('status')
        if (error) {
          console.error('Error fetching result stats:', error)
        } else if (data) {
          resultStats = data as Array<{ status: string }>
        }
      }
    }

    // Query for reports statistics
    let reportStats: Array<{ status: string }> = []
    {
      const base = supabase.from('reports').select('status')
      const { data, error } = companyId
        ? await base.eq('company_id', companyId)
        : await base
      if (error) {
        console.error('Error fetching report stats:', error)
      } else if (data) {
        reportStats = data as Array<{ status: string }>
      }
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