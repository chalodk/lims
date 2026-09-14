'use client'

import GenericLimsLoginScreen from '@/components/auth/GenericLimsLoginScreen'
import NemachileLoginScreen from '@/components/auth/NemachileLoginScreen'
import { useAppBranding } from '@/contexts/AppBrandingContext'

export default function LoginPage() {
  const brandingId = useAppBranding()

  if (brandingId === 'generic') {
    return <GenericLimsLoginScreen />
  }

  return <NemachileLoginScreen />
}
