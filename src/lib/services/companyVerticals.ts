import type { SupabaseClient } from '@supabase/supabase-js'
import {
  resolveSessionVertical,
  type CompanyVerticalRow,
  type SessionVertical,
} from '@/config/verticals'
import { resolveUserCompanyId } from '@/lib/services/companyFeatureFlags'

type CompanyVerticalQueryRow = {
  active: boolean
  is_primary: boolean
  verticals: { key: string } | { key: string }[] | null
}

function toCompanyVerticalRows(rows: CompanyVerticalQueryRow[]): CompanyVerticalRow[] {
  return rows.map((row) => {
    const vertical = Array.isArray(row.verticals) ? row.verticals[0] : row.verticals
    return {
      active: row.active,
      is_primary: row.is_primary,
      vertical_key: vertical?.key ?? '',
    }
  })
}

export async function getCompanySessionVertical(
  supabase: SupabaseClient,
  companyId: string
): Promise<SessionVertical> {
  const { data, error } = await supabase
    .from('company_verticals')
    .select('active, is_primary, verticals(key)')
    .eq('company_id', companyId)

  if (error) {
    throw new Error(error.message)
  }

  return resolveSessionVertical(toCompanyVerticalRows((data || []) as CompanyVerticalQueryRow[]))
}

export async function getSessionVerticalForUser(
  supabase: SupabaseClient,
  userId: string,
  userCompanyId?: string | null
): Promise<{ vertical: SessionVertical; companyId: string | null }> {
  const companyId = await resolveUserCompanyId(supabase, userId, userCompanyId)
  if (!companyId) {
    return { vertical: { status: 'none' }, companyId: null }
  }
  const vertical = await getCompanySessionVertical(supabase, companyId)
  return { vertical, companyId }
}

/**
 * Asigna una única vertical primaria y activa a la company. Las demás filas quedan
 * inactivas y no primarias, porque en esta etapa una company opera una sola vertical.
 */
export async function setCompanyPrimaryVertical(
  supabase: SupabaseClient,
  companyId: string,
  verticalKey: string
): Promise<void> {
  const { data: vertical, error: verticalError } = await supabase
    .from('verticals')
    .select('id')
    .eq('key', verticalKey)
    .single()

  if (verticalError || !vertical) {
    throw new Error(`Vertical desconocida: ${verticalKey}`)
  }

  const { error: demoteError } = await supabase
    .from('company_verticals')
    .update({ is_primary: false, active: false, updated_at: new Date().toISOString() })
    .eq('company_id', companyId)
    .neq('vertical_id', vertical.id)

  if (demoteError) {
    throw new Error(demoteError.message)
  }

  const { error: upsertError } = await supabase
    .from('company_verticals')
    .upsert(
      {
        company_id: companyId,
        vertical_id: vertical.id,
        active: true,
        is_primary: true,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'company_id,vertical_id' }
    )

  if (upsertError) {
    throw new Error(upsertError.message)
  }
}
