import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { executeCompanyOperationalCounts } from '@/lib/companies/purgeCompanyData'

/**
 * GET /api/admin/companies/[id]/operational-data
 * Conteos de muestras, resultados e informes de suelo. Solo CSX, y solo si
 * la vertical primaria activa de la compañía es suelo.
 */
export const GET = withAuth(async (_request, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)

    const result = await executeCompanyOperationalCounts(companyId, {
      loadCompany: async (id) => {
        const { data, error } = await supabase
          .from('companies')
          .select('name')
          .eq('id', id)
          .maybeSingle()
        if (error) throw new Error(error.message)
        if (!data?.name) return null
        return { name: data.name }
      },
      countOperationalData: async (id) => {
        const { data, error } = await supabase.rpc('csx_company_operational_counts', {
          p_company_id: id,
        })
        return {
          data,
          error: error ? { code: error.code, message: error.message } : null,
        }
      },
    })

    if ('logMessage' in result && result.logMessage) {
      console.error('Error en GET /api/admin/companies/[id]/operational-data:', result.logMessage)
    }

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Error en GET /api/admin/companies/[id]/operational-data:', error)
    return NextResponse.json({ error: 'Error al leer los datos del laboratorio' }, { status: 500 })
  }
})
