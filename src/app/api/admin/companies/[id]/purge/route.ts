import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  SOIL_IMPORTS_BUCKET,
  executePurgeCompanyOperationalData,
} from '@/lib/companies/purgeCompanyData'

const STORAGE_BATCH_SIZE = 100

/**
 * POST /api/admin/companies/[id]/purge
 * Borra la data operativa de suelo de una compañía. Solo CSX.
 * El body debe traer confirmName igual al nombre de la compañía.
 * La función rechaza laboratorios que no tienen suelo como vertical primaria.
 */
export const POST = withAuth(async (request, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)

    let body: unknown
    try {
      body = await request.json()
    } catch {
      return NextResponse.json(
        { error: 'Escribe el nombre de la compañía para confirmar' },
        { status: 400 }
      )
    }

    const result = await executePurgeCompanyOperationalData(companyId, body, {
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
      purgeOperationalData: async (id) => {
        const { data, error } = await supabase.rpc('csx_purge_company_operational_data', {
          p_company_id: id,
        })
        return {
          data,
          error: error ? { code: error.code, message: error.message } : null,
        }
      },
      removeImportFiles: async (storagePaths) => {
        if (storagePaths.length === 0) return []
        const storageAdmin = createServiceRoleClient()
        const failedPaths: string[] = []
        for (let index = 0; index < storagePaths.length; index += STORAGE_BATCH_SIZE) {
          const batch = storagePaths.slice(index, index + STORAGE_BATCH_SIZE)
          const { error } = await storageAdmin.storage.from(SOIL_IMPORTS_BUCKET).remove(batch)
          if (error) failedPaths.push(...batch)
        }
        return failedPaths
      },
    })

    if ('logMessage' in result && result.logMessage) {
      console.error('Error en POST /api/admin/companies/[id]/purge:', result.logMessage)
    }

    return NextResponse.json(result.body, { status: result.status })
  } catch (error) {
    console.error('Error en POST /api/admin/companies/[id]/purge:', error)
    return NextResponse.json({ error: 'Error al limpiar el laboratorio' }, { status: 500 })
  }
})
