'use client'

import Image from 'next/image'
import { useAppBranding } from '@/contexts/AppBrandingContext'
import { LIMS_LOGO_URL, NEMACHILE_LOGO_URL } from '@/lib/branding/hostBranding'
import { cn } from '@/lib/utils'

type AppBrandingLogoVariant = 'login' | 'sidebar' | 'mark'

function GenericLimsLogo({
  className,
  sizes,
  priority = false,
}: {
  className?: string
  sizes: string
  priority?: boolean
}) {
  return (
    <Image
      src={LIMS_LOGO_URL}
      alt="LIMS"
      width={2000}
      height={2000}
      className={cn('rounded-xl object-cover', className)}
      sizes={sizes}
      priority={priority}
    />
  )
}

export default function AppBrandingLogo({ variant }: { variant: AppBrandingLogoVariant }) {
  const brandingId = useAppBranding()

  if (brandingId === 'generic') {
    if (variant === 'mark') {
      return (
        <GenericLimsLogo
          className="h-9 w-9 shrink-0"
          sizes="36px"
        />
      )
    }

    const isLogin = variant === 'login'
    return (
      <div
        className={cn('flex items-center', isLogin ? 'flex-col gap-4' : 'gap-2.5')}
        aria-label="LIMS Agroanalytics"
      >
        <GenericLimsLogo
          className={cn('shrink-0', isLogin ? 'h-36 w-36 shadow-sm' : 'h-10 w-10')}
          sizes={isLogin ? '144px' : '40px'}
          priority
        />
        <div className={cn('flex flex-col leading-tight', isLogin ? 'items-center' : 'items-start')}>
          <span
            className={cn(
              'font-semibold tracking-tight text-emerald-950',
              isLogin ? 'text-2xl' : 'text-base'
            )}
          >
            LIMS
          </span>
          {isLogin && (
            <span className="text-xs font-medium tracking-[0.18em] text-emerald-800/70 uppercase">
              Agroanalytics
            </span>
          )}
        </div>
      </div>
    )
  }

  if (variant === 'mark') {
    return null
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
