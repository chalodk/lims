import { createBrowserClient } from '@supabase/ssr'
import { Database } from '@/types/database'
import type { SupabaseClient } from '@supabase/supabase-js'

let supabaseClient: SupabaseClient<Database> | null = null

export function getSupabaseClient(): SupabaseClient<Database> {
  if (!supabaseClient) {
    supabaseClient = createBrowserClient<Database>(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        auth: {
          autoRefreshToken: true,
          persistSession: true,
          detectSessionInUrl: true,
          flowType: 'pkce'
        },
        global: {
          headers: {
            'x-application-name': 'LIMS'
          }
        }
      }
    )
  }
  return supabaseClient
}

// Reset function for testing or when needed
export function resetSupabaseClient() {
  supabaseClient = null
}
