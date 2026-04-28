'use client'

import { createContext, useContext } from 'react'
import type { AppBrandingId } from '@/lib/branding/hostBranding'

const AppBrandingContext = createContext<AppBrandingId>('nemachile')

export function AppBrandingProvider({
  value,
  children,
}: {
  value: AppBrandingId
  children: React.ReactNode
}) {
  return <AppBrandingContext.Provider value={value}>{children}</AppBrandingContext.Provider>
}

export function useAppBranding(): AppBrandingId {
  return useContext(AppBrandingContext)
}
