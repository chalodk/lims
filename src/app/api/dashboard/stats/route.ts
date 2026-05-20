import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
    // Get user's company_id from users table
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id

    const { searchParams } = new URL(request.url)
    const completedDayStartParam = searchParams.get('completedDayStart')
    const completedDayEndParam = searchParams.get('completedDayEnd')
    const now = new Date()
    const completedRangeStart = completedDayStartParam
      ? new Date(completedDayStartParam)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 0, 0, 0, 0))
    const completedRangeEnd = completedDayEndParam
      ? new Date(completedDayEndParam)
      : new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59, 999))

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

    let completedToday = 0
    {
      const validatedQuery = companyId
        ? supabase
            .from('results')
            .select('id, samples!inner(company_id)', { count: 'exact', head: true })
            .eq('samples.company_id', companyId)
            .eq('status', 'validated')
            .gte('validation_date', completedRangeStart.toISOString())
            .lte('validation_date', completedRangeEnd.toISOString())
        : supabase
            .from('results')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'validated')
            .gte('validation_date', completedRangeStart.toISOString())
            .lte('validation_date', completedRangeEnd.toISOString())

      const completedOnlyQuery = companyId
        ? supabase
            .from('results')
            .select('id, samples!inner(company_id)', { count: 'exact', head: true })
            .eq('samples.company_id', companyId)
            .eq('status', 'completed')
            .gte('updated_at', completedRangeStart.toISOString())
            .lte('updated_at', completedRangeEnd.toISOString())
        : supabase
            .from('results')
            .select('id', { count: 'exact', head: true })
            .eq('status', 'completed')
            .gte('updated_at', completedRangeStart.toISOString())
            .lte('updated_at', completedRangeEnd.toISOString())

      const [{ count: validatedTodayCount }, { count: completedOnlyTodayCount }] = await Promise.all([
        validatedQuery,
        completedOnlyQuery
      ])

      completedToday =
        (validatedTodayCount ?? 0) + (completedOnlyTodayCount ?? 0)
    }

    return NextResponse.json({
      samples: sampleCounts,
      results: resultCounts,
      reports: reportCounts,
      overview: {
        activeSamples,
        pendingWork,
        completedWork,
        completedToday,
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
})