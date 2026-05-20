import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

export const GET = withAuth(async (_request, { supabase }) => {
  const { data, error } = await supabase
    .from('test_catalog')
    .select('*')
    .eq('active', true)
    .order('name')

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
})
