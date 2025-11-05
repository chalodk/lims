import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

/**
 * Error thrown when authentication fails
 */
export class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

/**
 * Centralized authentication helper for API routes
 * Returns the authenticated user or throws an AuthenticationError
 */
export async function authenticateApiRequest(): Promise<{ user: User; supabase: Awaited<ReturnType<typeof createClient>> }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthenticationError('Unauthorized')
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
      // If error is an authentication error, return 401
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      // Otherwise, return a generic error
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
