import { NextRequest, NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'
import {
  MAX_REPORT_IMAGES,
  REPORT_IMAGE_MAX_BYTES,
  describeReportImageFile,
  isReportId,
} from '@/lib/reports/reportImages'
import { uploadReportImages, type ReportImageUpload } from '@/lib/reports/reportImageStorage'

/**
 * POST /api/reports/[id]/images
 * El segmento dinámico se llama sampleId porque ya existe /api/reports/[sampleId]/render.
 * Aquí el valor es el id del informe.
 * multipart field: images (hasta 3 archivos png, jpeg o webp)
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

    const { sampleId: reportId } = await (params as Promise<{ sampleId: string }>)
    if (!isReportId(reportId)) {
      return NextResponse.json({ error: 'Informe inválido' }, { status: 400 })
    }

    const { data: report, error: fetchError } = await supabase
      .from('reports')
      .select('id, company_id')
      .eq('id', reportId)
      .eq('company_id', companyId)
      .single()

    if (fetchError || !report) {
      return NextResponse.json({ error: 'Informe no encontrado' }, { status: 404 })
    }

    const formData = await request.formData()
    const uploadedFiles = formData
      .getAll('images')
      .filter((entry): entry is File => entry instanceof File)

    if (uploadedFiles.length < 1 || uploadedFiles.length > MAX_REPORT_IMAGES) {
      return NextResponse.json(
        { error: `Se pueden adjuntar entre 1 y ${MAX_REPORT_IMAGES} imágenes` },
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
      const urls = await uploadReportImages(reportId, images)
      return NextResponse.json({ urls })
    } catch (uploadError) {
      console.error('Error uploading report images:', uploadError)
      return NextResponse.json(
        {
          error: 'No se pudieron subir las imágenes',
          details: uploadError instanceof Error ? uploadError.message : 'Error desconocido',
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error en POST /api/reports/[id]/images:', error)
    return NextResponse.json(
      {
        error: 'Error interno del servidor',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
