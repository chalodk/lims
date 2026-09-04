import type { SupabaseClient } from '@supabase/supabase-js'
import {
  parseFeatureFlagOverrides,
  resolveCompanyFeatures,
  type ResolvedFeatureFlags,
} from '@/config/featureFlags'

/**
 * company_id del usuario, o el de su primer cliente vinculado (consumidor).
 */
export async function resolveUserCompanyId(
  supabase: SupabaseClient,
  userId: string,
  userCompanyId?: string | null
): Promise<string | null> {
  if (userCompanyId) return userCompanyId

  const { data: userRow } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .maybeSingle()

  if (userRow?.company_id) return userRow.company_id

  const { data: links } = await supabase
    .from('user_clients')
    .select('client_id')
    .eq('user_id', userId)

  const clientIds = (links || [])
    .map((row: { client_id: string }) => row.client_id)
    .filter(Boolean)

  if (clientIds.length === 0) return null

  const { data: client } = await supabase
    .from('clients')
    .select('company_id')
    .in('id', clientIds)
    .not('company_id', 'is', null)
    .limit(1)
    .maybeSingle()

  return client?.company_id ?? null
}

export async function getCompanyFeatures(
  supabase: SupabaseClient,
  companyId: string
): Promise<ResolvedFeatureFlags> {
  const { data, error } = await supabase
    .from('companies')
    .select('feature_flags')
    .eq('id', companyId)
    .single()

  if (error || !data) {
    throw new Error(error?.message || 'Compañía no encontrada')
  }

  return resolveCompanyFeatures(parseFeatureFlagOverrides(data.feature_flags))
}

export async function getFeaturesForUser(
  supabase: SupabaseClient,
  userId: string,
  userCompanyId?: string | null
): Promise<{ flags: ResolvedFeatureFlags; companyId: string | null }> {
  const companyId = await resolveUserCompanyId(supabase, userId, userCompanyId)
  if (!companyId) {
    return { flags: resolveCompanyFeatures(), companyId: null }
  }

  try {
    const flags = await getCompanyFeatures(supabase, companyId)
    return { flags, companyId }
  } catch {
    return { flags: resolveCompanyFeatures(), companyId }
  }
}

export async function isCompanyFeatureEnabled(
  supabase: SupabaseClient,
  companyId: string,
  flag: keyof ResolvedFeatureFlags
): Promise<boolean> {
  const flags = await getCompanyFeatures(supabase, companyId)
  return flags[flag]
}

