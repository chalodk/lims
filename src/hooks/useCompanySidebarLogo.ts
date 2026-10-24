'use client'

import { useEffect, useState } from 'react'
import type { AppBrandingId } from '@/lib/branding/hostBranding'

interface CompanySidebarLogo {
  logoUrl: string | null
  companyName: string | null
  isLoading: boolean
}

export function useCompanySidebarLogo(
  enabled: boolean,
  brandingId: AppBrandingId,
  authLoading = false
): CompanySidebarLogo {
  const [logoUrl, setLogoUrl] = useState<string | null>(null)
  const [companyName, setCompanyName] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(brandingId === 'generic')

  useEffect(() => {
    if (brandingId !== 'generic') {
      setLogoUrl(null)
      setCompanyName(null)
      setIsLoading(false)
      return
    }

    if (authLoading) {
      setIsLoading(true)
      return
    }

    if (!enabled) {
      setLogoUrl(null)
      setCompanyName(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    setIsLoading(true)

    void (async () => {
      try {
        const response = await fetch('/api/branding/logo')
        const data = await response.json()
        if (cancelled) return
        if (!response.ok) {
          setLogoUrl(null)
          setCompanyName(null)
          return
        }
        setLogoUrl(typeof data.logoUrl === 'string' && data.logoUrl ? data.logoUrl : null)
        setCompanyName(typeof data.companyName === 'string' ? data.companyName : null)
      } catch {
        if (!cancelled) {
          setLogoUrl(null)
          setCompanyName(null)
        }
      } finally {
        if (!cancelled) setIsLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [enabled, brandingId, authLoading])

  return { logoUrl, companyName, isLoading }
}
