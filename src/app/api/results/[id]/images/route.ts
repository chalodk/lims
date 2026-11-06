import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type SupabaseServerClient } from '@/lib/auth/api-auth'
import {
  MAX_REPORT_IMAGES,
  REPORT_IMAGE_MAX_BYTES,
  describeReportImageFile,
  isReportId,
  isSafeReportImageFileName,
} from '@/lib/reports/reportImages'
import {
  listStoredResultImages,
  syncResultImages,
  type ReportImageUpload,
} from '@/lib/reports/reportImageStorage'

async function resultBelongsToCompany(
  supabase: SupabaseServerClient,
  resultId: string,
  companyId: string
): Promise<boolean> {
  const { data, error } = await supabase
    .from('results')
    .select('id, samples!inner(company_id)')
    .eq('id', resultId)
    .eq('samples.company_id', companyId)
    .maybeSingle()

  return !error && Boolean(data)
}

/**
 * GET /api/results/[id]/images
 * Lista las imágenes públicas de la carpeta del resultado.
 */
export const GET = withAuth(async (_request: NextRequest, { user, supabase, params }) => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const { id: resultId } = await (params as Promise<{ id: string }>)
    if (!isReportId(resultId)) {
      return NextResponse.json({ error: 'Resultado inválido' }, { status: 400 })
    }

    const allowed = await resultBelongsToCompany(supabase, resultId, companyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
    }

    try {
      const images = await listStoredResultImages(resultId)
      return NextResponse.json({ images })
    } catch (listError) {
      console.error('Error listing result images:', listError)
      return NextResponse.json(
        { error: 'No se pudieron leer las imágenes del resultado' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error en GET /api/results/[id]/images:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})

/**
 * POST /api/results/[id]/images
 * multipart: images (archivos nuevos) y keep (nombres que se conservan).
 * El conjunto final no supera las 3 imágenes.
 */
export const POST = withAuth(async (request: NextRequest, { user, supabase, params }) => {
  try {
    const { data: userData } = await supabase
      .from('users')
      .select('company_id')
      .eq('id', user.id)
      .single()

    const companyId = userData?.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin empresa asignada' }, { status: 400 })
    }

    const { id: resultId } = await (params as Promise<{ id: string }>)
    if (!isReportId(resultId)) {
      return NextResponse.json({ error: 'Resultado inválido' }, { status: 400 })
    }

    const allowed = await resultBelongsToCompany(supabase, resultId, companyId)
    if (!allowed) {
      return NextResponse.json({ error: 'Resultado no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const keepFileNames = [...new Set(
      formData
        .getAll('keep')
        .filter((entry): entry is string => typeof entry === 'string' && isSafeReportImageFileName(entry))
    )]
    const uploadedFiles = formData
      .getAll('images')
      .filter((entry): entry is File => entry instanceof File)

    if (keepFileNames.length + uploadedFiles.length > MAX_REPORT_IMAGES) {
      return NextResponse.json(
        { error: `Se pueden adjuntar hasta ${MAX_REPORT_IMAGES} imágenes` },
        { status: 400 }
      )
    }

    const images: ReportImageUpload[] = []
    for (const file of uploadedFiles) {
      if (file.size <= 0 || file.size > REPORT_IMAGE_MAX_BYTES) {
        return NextResponse.json(
          { error: 'Cada imagen debe pesar entre 1 byte y 5 MB' },
          { status: 400 }
        )
      }

      const descriptor = describeReportImageFile(file.type, file.name)
      if (!descriptor) {
        return NextResponse.json(
          { error: 'Formato no permitido. Usa png, jpeg o webp.' },
          { status: 400 }
        )
      }

      images.push({
        extension: descriptor.extension,
        contentType: descriptor.contentType,
        bytes: Buffer.from(await file.arrayBuffer()),
      })
    }

    try {
      const storedImages = await syncResultImages(resultId, keepFileNames, images)
      return NextResponse.json({ images: storedImages })
    } catch (uploadError) {
      console.error('Error syncing result images:', uploadError)
      return NextResponse.json(
        {
          error: 'No se pudieron subir las imágenes',
          details: uploadError instanceof Error ? uploadError.message : 'Error desconocido',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error en POST /api/results/[id]/images:', error)
    return NextResponse.json({ error: 'Error interno del servidor' }, { status: 500 })
  }
})
