import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import type { User } from '@supabase/supabase-js'

export type SupabaseServerClient = Awaited<ReturnType<typeof createClient>>

export class AuthenticationError extends Error {
  constructor(message: string = 'Unauthorized') {
    super(message)
    this.name = 'AuthenticationError'
  }
}

export async function authenticateApiRequest(): Promise<{ user: User; supabase: SupabaseServerClient }> {
  const supabase = await createClient()
  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    throw new AuthenticationError('Unauthorized')
  }

  return { user, supabase }
}

type AuthContext = {
  user: User
  supabase: SupabaseServerClient
  params: unknown
}

/**
 * Wraps an API route handler with authentication.
 * Injects { user, supabase, params } into the handler's second argument.
 *
 * Usage:
 *   // Route without params
 *   export const GET = withAuth(async (req, { user, supabase }) => { ... })
 *
 *   // Route with params
 *   export const GET = withAuth(async (req, { user, supabase, params }) => {
 *     const { id } = await (params as Promise<{ id: string }>)
 *   })
 */
export function withAuth(
  handler: (request: NextRequest, ctx: AuthContext) => Promise<Response>
) {
  return async (request: NextRequest, routeCtx: { params: Promise<unknown> }): Promise<Response> => {
    try {
      const { user, supabase } = await authenticateApiRequest()
      return await handler(request, { user, supabase, params: routeCtx.params })
    } catch (error) {
      if (error instanceof AuthenticationError) {
        return NextResponse.json({ error: error.message }, { status: 401 })
      }
      return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
    }
  }
}
