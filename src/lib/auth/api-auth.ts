import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Centralized authentication helper for API routes
 * Returns the authenticated user or throws a NextResponse with 401
 */
export async function authenticateApiRequest(): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  return { user, supabase }
}

/**
 * Wrapper function to easily protect API routes
 * Usage: export const GET = withAuth(async (request, { user, supabase }) => { ... })
 */
export function withAuth<T extends unknown[]>(
  handler: (request: Request, context: { user: User; supabase: Awaited<ReturnType<typeof createClient>> }, ...args: T) => Promise<Response>
) {
  return async (request: Request, ...args: T): Promise<Response> => {
    try {
      const { user, supabase } = await authenticateApiRequest()
      return await handler(request, { user, supabase }, ...args)
    } catch (error) {
      // If error is already a NextResponse, return it
      if (error instanceof Response) {
        return error
      }
      // Otherwise, return a generic error
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
