import { createServiceRoleClient } from '@/lib/supabase/admin'
import {
  REPORT_IMAGES_BUCKET,
  assignResultImageSlots,
  isReportId,
  isSafeReportImageFileName,
  reportImageFileNames,
  reportImageObjectPath,
  reportImageStoragePath,
} from '@/lib/reports/reportImages'

export interface ReportImageUpload {
  extension: string
  contentType: string
  bytes: Buffer
}

export interface StoredResultImage {
  name: string
  url: string
}

async function listResultFolder(resultId: string): Promise<StoredResultImage[]> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin.storage.from(REPORT_IMAGES_BUCKET).list(resultId, {
    limit: 100,
    sortBy: { column: 'name', order: 'asc' },
  })

  if (error) {
    throw new Error(error.message)
  }

  return reportImageFileNames(data ?? []).map((fileName) => {
    const { data: urlData } = admin.storage
      .from(REPORT_IMAGES_BUCKET)
      .getPublicUrl(reportImageObjectPath(resultId, fileName))
    return { name: fileName, url: urlData.publicUrl }
  })
}

export async function listStoredResultImages(resultId: string): Promise<StoredResultImage[]> {
  if (!isReportId(resultId)) return []
  return listResultFolder(resultId)
}

export async function listResultImagePublicUrls(resultIds: string[]): Promise<string[]> {
  const urls: string[] = []
  for (const resultId of resultIds) {
    if (!isReportId(resultId)) continue
    const images = await listResultFolder(resultId)
    urls.push(...images.map((image) => image.url))
  }
  return urls
}

/**
 * Deja la carpeta del resultado con las imágenes conservadas más las nuevas.
 * Las nuevas ocupan los huecos 01–03 que hayan quedado libres.
 */
export async function syncResultImages(
  resultId: string,
  keepFileNames: string[],
  files: ReportImageUpload[]
): Promise<StoredResultImage[]> {
  if (!isReportId(resultId)) {
    throw new Error('resultId inválido')
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.storage.from(REPORT_IMAGES_BUCKET).list(resultId, {
    limit: 100,
  })
  if (error) {
    throw new Error(error.message)
  }

  const existingNames = reportImageFileNames(data ?? [])
  const uniqueKeep = [...new Set(keepFileNames.filter(isSafeReportImageFileName))]
  const keep = uniqueKeep.filter((fileName) => existingNames.includes(fileName))
  const slots = assignResultImageSlots(keep, files.length)
  const namesToRemove = existingNames.filter((fileName) => !keep.includes(fileName))

  if (namesToRemove.length > 0) {
    const { error: removeError } = await admin.storage
      .from(REPORT_IMAGES_BUCKET)
      .remove(namesToRemove.map((fileName) => reportImageObjectPath(resultId, fileName)))
    if (removeError) {
      throw new Error(removeError.message)
    }
  }

  const uploadedPaths: string[] = []
  try {
    for (let index = 0; index < files.length; index += 1) {
      const file = files[index]
      const storagePath = reportImageStoragePath(resultId, slots[index], file.extension)
      const { error: uploadError } = await admin.storage
        .from(REPORT_IMAGES_BUCKET)
        .upload(storagePath, file.bytes, {
          contentType: file.contentType,
          upsert: true,
        })
      if (uploadError) {
        throw new Error(uploadError.message)
      }
      uploadedPaths.push(storagePath)
    }
  } catch (uploadError) {
    if (uploadedPaths.length > 0) {
      await admin.storage.from(REPORT_IMAGES_BUCKET).remove(uploadedPaths).catch((cleanupError) => {
        console.error('Error cleaning result images after a failed upload:', cleanupError)
      })
    }
    throw uploadError
  }

  return listResultFolder(resultId)
}

export async function deleteResultImageObjects(resultId: string): Promise<void> {
  if (!isReportId(resultId)) {
    throw new Error('resultId inválido')
  }

  const admin = createServiceRoleClient()
  const { data, error } = await admin.storage.from(REPORT_IMAGES_BUCKET).list(resultId, {
    limit: 100,
  })
  if (error) {
    throw new Error(error.message)
  }

  const objectPaths = reportImageFileNames(data ?? []).map((fileName) =>
    reportImageObjectPath(resultId, fileName)
  )
  if (objectPaths.length === 0) return

  const { error: removeError } = await admin.storage.from(REPORT_IMAGES_BUCKET).remove(objectPaths)
  if (removeError) {
    throw new Error(removeError.message)
  }
}
