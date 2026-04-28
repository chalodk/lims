'use client'

import Image from 'next/image'
import { FlaskConical } from 'lucide-react'
import { useAppBranding } from '@/contexts/AppBrandingContext'
import { NEMACHILE_LOGO_URL } from '@/lib/branding/hostBranding'

type AppBrandingLogoVariant = 'login' | 'sidebar'

export default function AppBrandingLogo({ variant }: { variant: AppBrandingLogoVariant }) {
  const brandingId = useAppBranding()

  if (brandingId === 'generic') {
    const iconClass = variant === 'login' ? 'h-12 w-12' : 'h-9 w-9'
    const titleClass =
      variant === 'login' ? 'text-2xl font-bold tracking-tight' : 'text-lg font-bold tracking-tight'
    return (
      <div className="flex items-center justify-center gap-2 text-emerald-800" aria-label="LIMS Agroanalytics">
        <FlaskConical className={`${iconClass} shrink-0`} strokeWidth={2} />
        <div className="flex flex-col items-start leading-tight">
          <span className={titleClass}>LIMS</span>
          {variant === 'login' && (
            <span className="text-sm font-medium text-emerald-700/90">Agroanalytics</span>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'login') {
    return (
      <Image
        src={NEMACHILE_LOGO_URL}
        alt="Nemachile"
        width={250}
        height={100}
        className="h-auto"
        priority
      />
    )
  }

  return (
    <Image
      src={NEMACHILE_LOGO_URL}
      alt="Nemachile"
      width={140}
      height={42}
      className="w-[140px] h-auto max-w-full"
      priority
    />
  )
}
