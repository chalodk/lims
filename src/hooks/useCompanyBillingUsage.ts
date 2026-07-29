'use client'

import { useCallback, useEffect, useState } from 'react'
import type { CompanyUsageSnapshot } from '@/lib/services/companyUsageService'

export function useCompanyBillingUsage(enabled = true) {
  const [usage, setUsage] = useState<CompanyUsageSnapshot | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const refresh = useCallback(async () => {
    if (!enabled) return
    setIsLoading(true)
    setError(null)
    try {
      const response = await fetch('/api/billing/usage')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar uso del plan')
      }
      setUsage(data.usage as CompanyUsageSnapshot)
    } catch (err) {
      setUsage(null)
      setError(err instanceof Error ? err.message : 'Error al cargar uso del plan')
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { usage, isLoading, error, refresh }
}
