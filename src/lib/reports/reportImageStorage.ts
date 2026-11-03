import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  MAX_REPORT_IMAGES,
  REPORT_IMAGES_BUCKET,
  isReportId,
  reportImageFileNames,
  reportImageObjectPath,
  reportImageStoragePath,
} from '@/lib/reports/reportImages'

export interface ReportImageUpload {
  extension: string
  contentType: string
  bytes: Buffer
}

async function removeReportImagePrefix(reportId: string): Promise<void> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin.storage.from(REPORT_IMAGES_BUCKET).list(reportId, {
    limit: 100,
  })

  if (error) {
    throw new Error(error.message)
  }

  const objectPaths = reportImageFileNames(data ?? []).map((fileName) =>
    reportImageObjectPath(reportId, fileName)
  )
  if (objectPaths.length === 0) return

  const { error: removeError } = await admin.storage.from(REPORT_IMAGES_BUCKET).remove(objectPaths)
  if (removeError) {
    throw new Error(removeError.message)
  }
}

export async function uploadReportImages(
  reportId: string,
  files: ReportImageUpload[]
): Promise<string[]> {
  if (!isReportId(reportId)) {
    throw new Error('reportId inválido')
  }
  if (files.length < 1 || files.length > MAX_REPORT_IMAGES) {
    throw new Error('Cantidad de imágenes inválida')
  }

  const admin = createServiceRoleClient()
  const publicUrls: string[] = []

  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const storagePath = reportImageStoragePath(reportId, index + 1, file.extension)
      const { error } = await admin.storage.from(REPORT_IMAGES_BUCKET).upload(storagePath, file.bytes, {
        contentType: file.contentType,
        upsert: true,
      })
      if (error) {
        throw new Error(error.message)
      }

      const { data } = admin.storage.from(REPORT_IMAGES_BUCKET).getPublicUrl(storagePath)
      publicUrls.push(data.publicUrl)
    }
  } catch (error) {
    await removeReportImagePrefix(reportId).catch((cleanupError) => {
      console.error('Error cleaning report images after a failed upload:', cleanupError)
    })
    throw error
  }

  return publicUrls
}

export async function listReportImagePublicUrls(reportId: string): Promise<string[]> {
  if (!isReportId(reportId)) return []

  const admin = createServiceRoleClient()
  const { data, error } = await admin.storage.from(REPORT_IMAGES_BUCKET).list(reportId, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  return reportImageFileNames(data ?? []).map((fileName) => {
    const { data: urlData } = admin.storage
      .from(REPORT_IMAGES_BUCKET)
      .getPublicUrl(reportImageObjectPath(reportId, fileName))
    return urlData.publicUrl
  })
}

export async function deleteReportImageObjects(reportId: string): Promise<void> {
  if (!isReportId(reportId)) {
    throw new Error('reportId inválido')
  }
  await removeReportImagePrefix(reportId)
}
