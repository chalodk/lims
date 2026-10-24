'use client'

import AppBrandingLogo from '@/components/branding/AppBrandingLogo'
import { useAppBranding } from '@/contexts/AppBrandingContext'
import { cn } from '@/lib/utils'

export default function SidebarBrand({
  collapsed = false,
  logoUrl = null,
  companyName = null,
  isLoading = false,
}: {
  collapsed?: boolean
  logoUrl?: string | null
  companyName?: string | null
  isLoading?: boolean
}) {
  const brandingId = useAppBranding()

  if (brandingId === 'generic' && isLoading) {
    return (
      <div
        className={cn('shrink-0', collapsed ? 'h-9 w-9' : 'h-10 w-[140px]')}
        aria-hidden
      />
    )
  }

  if (logoUrl) {
    return (
      // Logos de company pueden ser SVG; next/image no los sirve sin dangerouslyAllowSVG.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={logoUrl}
        alt={companyName ? `Logo de ${companyName}` : 'Logo'}
        className={cn(
          'shrink-0 object-contain',
          collapsed ? 'h-9 w-9' : 'h-10 max-h-10 w-auto max-w-[140px]'
        )}
      />
    )
  }

  return <AppBrandingLogo variant={collapsed ? 'mark' : 'sidebar'} />
}
