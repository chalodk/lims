/**
 * Resolves UI branding from the request hostname (Netlify sets x-forwarded-host).
 * Override hosts via NEXT_PUBLIC_NEMACHILE_HOSTS / NEXT_PUBLIC_SAAS_HOSTS (comma-separated).
 */

export type AppBrandingId = 'nemachile' | 'generic'

export const NEMACHILE_LOGO_URL =
  'https://nemachile.cl/logo-header.png'

export const LIMS_LOGO_URL = '/branding/lims-logo.png'
export const LIMS_FAVICON_URL = '/branding/2.svg'

export type SocialPreviewImage = {
  url: string
  alt: string
  width?: number
  height?: number
}

export function getSocialPreviewImage(brandingId: AppBrandingId): SocialPreviewImage {
  if (brandingId === 'nemachile') {
    return {
      url: NEMACHILE_LOGO_URL,
      alt: 'Nemachile',
    }
  }

  return {
    url: LIMS_LOGO_URL,
    alt: 'LIMS Agroanalytics',
    width: 2000,
    height: 2000,
  }
}

export function getRequestOrigin(
  hostHeader: string | null,
  forwardedHostHeader: string | null,
  forwardedProtoHeader: string | null
): string {
  const host =
    forwardedHostHeader?.split(',')[0]?.trim() ||
    hostHeader?.trim() ||
    'lims.agroanalytics.cl'
  const isLocal = host.startsWith('localhost') || host.startsWith('127.0.0.1')
  const protocol = isLocal ? forwardedProtoHeader || 'http' : 'https'
  return `${protocol}://${host}`
}

function parseHostList(envValue: string | undefined, fallback: string): string[] {
  return (envValue ?? fallback)
    .split(',')
    .map((hostEntry) => hostEntry.trim().toLowerCase())
    .filter(Boolean)
}

export function getHostnameFromForwardedHeader(forwardedHost: string | null): string {
  if (!forwardedHost) return ''
  const first = forwardedHost.split(',')[0]?.trim() ?? ''
  return first.split(':')[0].toLowerCase()
}

export function getAppBrandingIdFromHostname(hostname: string): AppBrandingId {
  const host = hostname.split(':')[0].trim().toLowerCase()
  const saasHosts = parseHostList(process.env.NEXT_PUBLIC_SAAS_HOSTS, 'lims.agroanalytics.cl')
  const nemachileHosts = parseHostList(process.env.NEXT_PUBLIC_NEMACHILE_HOSTS, 'app.nemachile.cl')

  if (host && saasHosts.includes(host)) {
    return 'generic'
  }
  if (host && nemachileHosts.includes(host)) {
    return 'nemachile'
  }

  const fallback = process.env.NEXT_PUBLIC_BRANDING_FALLBACK as AppBrandingId | undefined
  if (fallback === 'generic' || fallback === 'nemachile') {
    return fallback
  }
  return 'nemachile'
}

export function resolveAppBrandingFromRequestHeaders(
  hostHeader: string | null,
  forwardedHostHeader: string | null
): AppBrandingId {
  const fromForwarded = getHostnameFromForwardedHeader(forwardedHostHeader)
  if (fromForwarded) {
    return getAppBrandingIdFromHostname(fromForwarded)
  }
  const fromHost = hostHeader ? hostHeader.split(':')[0].trim().toLowerCase() : ''
  return getAppBrandingIdFromHostname(fromHost)
}
