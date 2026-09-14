import { NextResponse, type NextRequest } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { getDashboardStats } from '@/lib/services/dashboardStats'

export const GET = withAuth(async (request, { user, supabase }) => {
  try {
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

    const stats = await getDashboardStats(supabase, {
      companyId,
      completedRangeStart,
      completedRangeEnd,
    })

    return NextResponse.json(stats)
  } catch (error) {
    console.error('Error fetching dashboard stats:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
})
