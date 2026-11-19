'use client'

import { useCallback, useEffect, useState } from 'react'
import type { SessionVertical } from '@/config/verticals'

export function useSessionVertical(enabled = true) {
  const [vertical, setVertical] = useState<SessionVertical>({ status: 'none' })
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
      const response = await fetch('/api/verticals/current')
      const data = await response.json()
      if (!response.ok) {
        throw new Error(data.error || 'Error al cargar la vertical')
      }
      setVertical(data.vertical as SessionVertical)
    } catch (err) {
      setVertical({ status: 'none' })
      setError(err instanceof Error ? err.message : 'Error al cargar la vertical')
    } finally {
      setIsLoading(false)
    }
  }, [enabled])

  useEffect(() => {
    void refresh()
  }, [refresh])

  return { vertical, isLoading, error, refresh }
}
