export const REPORT_IMAGES_BUCKET = 'reports'
export const MAX_REPORT_IMAGES = 3
export const REPORT_IMAGE_MAX_BYTES = 5 * 1024 * 1024

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
}

const FILENAME_EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
}

export const REPORT_IMAGE_EXTENSIONS = ['png', 'jpg', 'webp'] as const

const REPORT_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

const SAFE_FILE_NAME_PATTERN = /^[A-Za-z0-9._-]+$/

export interface ReportImageFileDescriptor {
  extension: string
  contentType: string
}

export interface StorageListEntry {
  name: string
  id?: string | null
}

export function isReportId(value: string): boolean {
  return REPORT_ID_PATTERN.test(value)
}

export function normalizeReportImageContentType(contentType: string): string {
  return contentType.split(';')[0]?.trim().toLowerCase() ?? ''
}

/**
 * Acepta png, jpeg y webp por content-type o, si el browser no lo manda, por extensión.
 */
export function describeReportImageFile(
  contentType: string,
  filename: string
): ReportImageFileDescriptor | null {
  const normalizedType = normalizeReportImageContentType(contentType)
  const extensionFromType = CONTENT_TYPE_TO_EXTENSION[normalizedType]
  if (extensionFromType) {
    return {
      extension: extensionFromType,
      contentType: extensionFromType === 'jpg' ? 'image/jpeg' : normalizedType,
    }
  }

  const filenameExtension = filename.split('.').pop()?.trim().toLowerCase() ?? ''
  const contentTypeFromName = FILENAME_EXTENSION_TO_CONTENT_TYPE[filenameExtension]
  if (!contentTypeFromName) return null

  return {
    extension: filenameExtension === 'jpeg' ? 'jpg' : filenameExtension,
    contentType: contentTypeFromName,
  }
}

/** Número de posición `01`–`03` de un archivo guardado, si el nombre lo trae. */
export function resultImageSlot(fileName: string): number | null {
  const match = /^(\d{2})\.[a-z0-9]+$/i.exec(fileName)
  if (!match) return null
  const slot = Number(match[1])
  if (slot < 1 || slot > MAX_REPORT_IMAGES) return null
  return slot
}

/**
 * Huecos libres para archivos nuevos. Los nombres conservados ocupan su posición
 * y el total no puede pasar de MAX_REPORT_IMAGES.
 */
export function assignResultImageSlots(keptFileNames: string[], newFileCount: number): number[] {
  if (newFileCount < 0 || keptFileNames.length + newFileCount > MAX_REPORT_IMAGES) {
    throw new Error('Cantidad de imágenes inválida')
  }

  const usedSlots = new Set<number>()
  for (const fileName of keptFileNames) {
    const slot = resultImageSlot(fileName)
    if (slot && !usedSlots.has(slot)) {
      usedSlots.add(slot)
      continue
    }
    for (let candidate = 1; candidate <= MAX_REPORT_IMAGES; candidate += 1) {
      if (!usedSlots.has(candidate)) {
        usedSlots.add(candidate)
        break
      }
    }
  }

  const assignedSlots: number[] = []
  for (let slot = 1; slot <= MAX_REPORT_IMAGES && assignedSlots.length < newFileCount; slot += 1) {
    if (!usedSlots.has(slot)) assignedSlots.push(slot)
  }
  if (assignedSlots.length < newFileCount) {
    throw new Error('No hay espacio para más imágenes')
  }
  return assignedSlots
}

export function reportImageStoragePath(
  reportId: string,
  index: number,
  extension: string
): string {
  if (!isReportId(reportId)) {
    throw new Error('reportId inválido')
  }
  if (!Number.isInteger(index) || index < 1 || index > MAX_REPORT_IMAGES) {
    throw new Error('índice de imagen inválido')
  }
  if (!REPORT_IMAGE_EXTENSIONS.includes(extension as (typeof REPORT_IMAGE_EXTENSIONS)[number])) {
    throw new Error('extensión de imagen inválida')
  }

  const paddedIndex = String(index).padStart(2, '0')
  return `${reportId}/${paddedIndex}.${extension}`
}

export function isSafeReportImageFileName(fileName: string): boolean {
  return SAFE_FILE_NAME_PATTERN.test(fileName) && !fileName.startsWith('.')
}

export function reportImageObjectPath(reportId: string, fileName: string): string {
  if (!isReportId(reportId)) {
    throw new Error('reportId inválido')
  }
  if (!isSafeReportImageFileName(fileName)) {
    throw new Error('nombre de imagen inválido')
  }
  return `${reportId}/${fileName}`
}

/** Archivos reales del prefijo, sin carpetas ni marcadores, ordenados por nombre. */
export function reportImageFileNames(entries: StorageListEntry[]): string[] {
  return entries
    .filter((entry) => Boolean(entry.id) && isSafeReportImageFileName(entry.name))
    .map((entry) => entry.name)
    .sort((left, right) => left.localeCompare(right))
}
