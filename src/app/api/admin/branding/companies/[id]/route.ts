import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import { requireCsx } from '@/lib/auth/requireCsx'
import { COMPANY_LOGO_MAX_BYTES, describeCompanyLogoFile, isCompanyId } from '@/lib/branding/companyLogo'
import { deleteCompanyLogoObjects, uploadCompanyLogoObject } from '@/lib/branding/companyLogoStorage'

async function loadCompany(
  supabase: Awaited<ReturnType<typeof import('@/lib/supabase/server').createClient>>,
  companyId: string
) {
  return supabase.from('companies').select('id, name, logo_url').eq('id', companyId).maybeSingle()
}

/**
 * POST /api/admin/branding/companies/[id]
 * Sube (o reemplaza) el logo. Solo csx. multipart field: logo
 */
export const POST = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)
    if (!isCompanyId(companyId)) {
      return NextResponse.json({ error: 'Compañía inválida' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await loadCompany(supabase, companyId)
    if (fetchError) {
      return NextResponse.json(
        { error: 'Error al obtener la compañía', details: fetchError.message },
        { status: 500 }
      )
    }
    if (!existing) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    const formData = await request.formData()
    const logo = formData.get('logo')
    if (!(logo instanceof File)) {
      return NextResponse.json({ error: 'Falta el archivo logo' }, { status: 400 })
    }
    if (logo.size <= 0 || logo.size > COMPANY_LOGO_MAX_BYTES) {
      return NextResponse.json({ error: 'El logo debe pesar entre 1 byte y 2 MB' }, { status: 400 })
    }

    const descriptor = describeCompanyLogoFile(logo.type, logo.name)
    if (!descriptor) {
      return NextResponse.json(
        { error: 'Formato no permitido. Usa png, jpeg, webp o svg.' },
        { status: 400 }
      )
    }

    const bytes = Buffer.from(await logo.arrayBuffer())
    let logoUrl: string
    try {
      logoUrl = await uploadCompanyLogoObject(
        companyId,
        descriptor.extension,
        descriptor.contentType,
        bytes
      )
    } catch (uploadError) {
      console.error('Error uploading company logo:', uploadError)
      return NextResponse.json(
        {
          error: 'Error al subir el logo',
          details: uploadError instanceof Error ? uploadError.message : 'Error desconocido',
        },
        { status: 500 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: logoUrl })
      .eq('id', companyId)
      .select('id, name, logo_url')
      .single()

    if (updateError || !updated) {
      console.error('Error saving company logo url:', updateError)
      return NextResponse.json(
        { error: 'Error al guardar el logo', details: updateError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      company: {
        companyId: updated.id,
        companyName: updated.name,
        logoUrl: updated.logo_url,
      },
    })
  } catch (error) {
    console.error('Error en POST /api/admin/branding/companies/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})

/**
 * DELETE /api/admin/branding/companies/[id]
 * Quita el logo y vuelve al branding del host. Solo csx.
 */
export const DELETE = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const access = await requireCsx(supabase, user.id)
    if (!access.ok) return access.response

    const { id: companyId } = await (params as Promise<{ id: string }>)
    if (!isCompanyId(companyId)) {
      return NextResponse.json({ error: 'Compañía inválida' }, { status: 400 })
    }

    const { data: existing, error: fetchError } = await loadCompany(supabase, companyId)
    if (fetchError) {
      return NextResponse.json(
        { error: 'Error al obtener la compañía', details: fetchError.message },
        { status: 500 }
      )
    }
    if (!existing) {
      return NextResponse.json({ error: 'Compañía no encontrada' }, { status: 404 })
    }

    try {
      await deleteCompanyLogoObjects(companyId)
    } catch (deleteError) {
      console.error('Error deleting company logo object:', deleteError)
      return NextResponse.json(
        {
          error: 'Error al borrar el archivo del logo',
          details: deleteError instanceof Error ? deleteError.message : 'Error desconocido',
        },
        { status: 500 }
      )
    }

    const { data: updated, error: updateError } = await supabase
      .from('companies')
      .update({ logo_url: null })
      .eq('id', companyId)
      .select('id, name, logo_url')
      .single()

    if (updateError || !updated) {
      console.error('Error clearing company logo url:', updateError)
      return NextResponse.json(
        { error: 'Error al quitar el logo', details: updateError?.message },
        { status: 500 }
      )
    }

    return NextResponse.json({
      company: {
        companyId: updated.id,
        companyName: updated.name,
        logoUrl: updated.logo_url,
      },
    })
  } catch (error) {
    console.error('Error en DELETE /api/admin/branding/companies/[id]:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
