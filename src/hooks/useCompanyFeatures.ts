'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  resolveCompanyFeatures,
  type FeatureFlagKey,
  type ResolvedFeatureFlags,
} from '@/config/featureFlags'

export function useCompanyFeatures(enabled = true) {
  const [flags, setFlags] = useState<ResolvedFeatureFlags>(() => resolveCompanyFeatures())
  const [companyId, setCompanyId] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) {
      setIsLoading(false)
      return
    }
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/features')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar features')
      }
      setFlags(data.flags as ResolvedFeatureFlags)
      setCompanyId(typeof data.companyId === 'string' ? data.companyId : null)
    } catch (err) {
      setFlags(resolveCompanyFeatures())
      setCompanyId(null)
      setError(err instanceof Error ? err.message : 'Error al cargar features')
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const isEnabled = useCallback(
    (key: FeatureFlagKey) => flags[key],
    [flags]
  )

  return { flags, companyId, isLoading, error, refresh, isEnabled }
}
