export const COMPANY_LOGO_BUCKET = 'images'
export const COMPANY_LOGO_MAX_BYTES = 2 * 1024 * 1024

const CONTENT_TYPE_TO_EXTENSION: Record<string, string> = {
  'image/png': 'png',
  'image/jpeg': 'jpg',
  'image/jpg': 'jpg',
  'image/webp': 'webp',
  'image/svg+xml': 'svg',
}

const FILENAME_EXTENSION_TO_CONTENT_TYPE: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  webp: 'image/webp',
  svg: 'image/svg+xml',
}

export const COMPANY_LOGO_EXTENSIONS = ['png', 'jpg', 'webp', 'svg'] as const

const COMPANY_ID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

export function isCompanyId(value: string): boolean {
  return COMPANY_ID_PATTERN.test(value)
}

export function normalizeImageContentType(contentType: string): string {
  return contentType.split(';')[0]?.trim().toLowerCase() ?? ''
}

export interface CompanyLogoFileDescriptor {
  extension: string
  contentType: string
}

/**
 * Acepta png, jpeg, webp y svg por content-type o, si el browser no lo manda, por extensión.
 */
export function describeCompanyLogoFile(
  contentType: string,
  filename: string
): CompanyLogoFileDescriptor | null {
  const normalizedType = normalizeImageContentType(contentType)
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

export function companyLogoStoragePath(companyId: string, extension: string): string {
  if (!isCompanyId(companyId)) {
    throw new Error('companyId inválido')
  }
  if (!COMPANY_LOGO_EXTENSIONS.includes(extension as (typeof COMPANY_LOGO_EXTENSIONS)[number])) {
    throw new Error('extensión de logo inválida')
  }
  return `companies/${companyId}/logo.${extension}`
}

export function companyLogoStoragePaths(companyId: string): string[] {
  return COMPANY_LOGO_EXTENSIONS.map((extension) => companyLogoStoragePath(companyId, extension))
}

export function companyLogoPublicUrl(publicUrl: string, version: number): string {
  const separator = publicUrl.includes('?') ? '&' : '?'
  return `${publicUrl}${separator}v=${version}`
}
