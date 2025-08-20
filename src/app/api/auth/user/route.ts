import { createClient } from '@/lib/supabase/server'
import { createClient as createServiceClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  try {
    // Use server client to get authenticated user
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      console.log('API: No authenticated user found', authError)
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 })
    }

    // Create service role client for database access
    const serviceSupabase = createServiceClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('API: Fetching user profile for', user.id)

    // Try to fetch user profile from database using service role
    const { data: userProfile, error: userError } = await serviceSupabase
      .from('users')
      .select('*')
      .eq('id', user.id)
      .single()

    if (userError) {
      console.error('API: Error fetching user profile:', userError)
      return NextResponse.json({ 
        error: 'Failed to fetch user profile',
        details: userError 
      }, { status: 500 })
    }

    console.log('API: User profile found:', userProfile)

    return NextResponse.json({ user: userProfile })
  } catch (error) {
    console.error('API: Unexpected error:', error)
    return NextResponse.json({ 
      error: 'Internal server error',
      details: error 
    }, { status: 500 })
  }
}