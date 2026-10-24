import {
  COMPANY_LOGO_BUCKET,
  companyLogoPublicUrl,
  companyLogoStoragePath,
  companyLogoStoragePaths,
} from '@/lib/branding/companyLogo'
import { createServiceRoleClient } from '@/lib/supabase/admin'

export async function uploadCompanyLogoObject(
  companyId: string,
  extension: string,
  contentType: string,
  bytes: Buffer
): Promise<string> {
  const admin = createServiceRoleClient()
  const storagePath = companyLogoStoragePath(companyId, extension)

  const { error: uploadError } = await admin.storage
    .from(COMPANY_LOGO_BUCKET)
    .upload(storagePath, bytes, {
      contentType,
      upsert: true,
    })

  if (uploadError) {
    throw new Error(uploadError.message)
  }

  const previousPaths = companyLogoStoragePaths(companyId).filter((path) => path !== storagePath)
  await admin.storage.from(COMPANY_LOGO_BUCKET).remove(previousPaths)

  const { data } = admin.storage.from(COMPANY_LOGO_BUCKET).getPublicUrl(storagePath)
  return companyLogoPublicUrl(data.publicUrl, Date.now())
}

export async function deleteCompanyLogoObjects(companyId: string): Promise<void> {
  const admin = createServiceRoleClient()
  const { error } = await admin.storage
    .from(COMPANY_LOGO_BUCKET)
    .remove(companyLogoStoragePaths(companyId))

  if (error) {
    throw new Error(error.message)
  }
}

export async function readCompanyLogoForCompany(companyId: string): Promise<{
  logoUrl: string | null
  companyName: string | null
}> {
  const admin = createServiceRoleClient()
  const { data, error } = await admin
    .from('companies')
    .select('name, logo_url')
    .eq('id', companyId)
    .maybeSingle()

  if (error || !data) {
    return { logoUrl: null, companyName: null }
  }

  return {
    logoUrl: data.logo_url,
    companyName: data.name,
  }
}
