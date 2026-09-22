'use client'

import React, { createContext, useContext, useEffect, useState, useCallback, useMemo } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import type { Vertical, CompanyVertical, VerticalKey, AnalysisTypeRow } from '@/types/database'
import { useAuth } from './AuthContext'
import {
  type AnalysisTypeEntry,
  ANALYSIS_TYPE_REGISTRY,
  dbRowToAnalysisTypeEntry,
  getStaticAnalysisTypesForVertical,
  createRegistryFromEntries,
  DEFAULT_VERTICAL_KEY,
} from '@/config/analysisTypes'
import { log, logError } from '@/lib/utils/logger'

interface VerticalState {
  verticals: Vertical[]
  companyVerticals: CompanyVertical[]
  activeVertical: Vertical | null
  activeVerticalKey: VerticalKey
  analysisTypes: AnalysisTypeEntry[]
  analysisTypeRegistry: Record<string, AnalysisTypeEntry>
  isLoading: boolean
  error: string | null
}

interface VerticalContextValue extends VerticalState {
  setActiveVertical: (verticalKey: VerticalKey) => Promise<void>
  refreshVerticals: () => Promise<void>
  hasAccessToVertical: (verticalKey: VerticalKey) => boolean
  getCompanyVerticals: () => CompanyVertical[]
}

const VerticalContext = createContext<VerticalContextValue | undefined>(undefined)

const initialState: VerticalState = {
  verticals: [],
  companyVerticals: [],
  activeVertical: null,
  activeVerticalKey: DEFAULT_VERTICAL_KEY,
  analysisTypes: Object.values(ANALYSIS_TYPE_REGISTRY).filter((e) => e.key !== 'default'),
  analysisTypeRegistry: ANALYSIS_TYPE_REGISTRY,
  isLoading: true,
  error: null,
}

export function VerticalProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<VerticalState>(initialState)
  const supabase = getSupabaseClient()
  const { user, isAuthenticated } = useAuth()

  const fetchVerticals = useCallback(async (): Promise<Vertical[]> => {
    try {
      const { data, error } = await supabase
        .from('verticals')
        .select('*')
        .eq('active', true)
        .order('label')

      if (error) {
        logError('Error fetching verticals:', error)
        return []
      }

      return data || []
    } catch (error) {
      logError('Error in fetchVerticals:', error)
      return []
    }
  }, [supabase])

  const fetchCompanyVerticals = useCallback(async (companyId: string): Promise<CompanyVertical[]> => {
    try {
      const { data, error } = await supabase
        .from('company_verticals')
        .select('*')
        .eq('company_id', companyId)
        .eq('active', true)

      if (error) {
        logError('Error fetching company verticals:', error)
        return []
      }

      return data || []
    } catch (error) {
      logError('Error in fetchCompanyVerticals:', error)
      return []
    }
  }, [supabase])

  const fetchAnalysisTypesForVertical = useCallback(async (verticalId: string): Promise<AnalysisTypeEntry[]> => {
    try {
      const { data, error } = await supabase
        .from('analysis_types')
        .select('*')
        .eq('vertical_id', verticalId)
        .eq('active', true)

      if (error) {
        logError('Error fetching analysis types:', error)
        return []
      }

      return (data || []).map((row: AnalysisTypeRow) => dbRowToAnalysisTypeEntry(row))
    } catch (error) {
      logError('Error in fetchAnalysisTypesForVertical:', error)
      return []
    }
  }, [supabase])

  const refreshVerticals = useCallback(async () => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }))

    try {
      const verticals = await fetchVerticals()

      if (!user?.company_id) {
        const defaultVertical = verticals.find((v) => v.key === DEFAULT_VERTICAL_KEY) || null
        const staticAnalysisTypes = getStaticAnalysisTypesForVertical(DEFAULT_VERTICAL_KEY)

        setState({
          verticals,
          companyVerticals: [],
          activeVertical: defaultVertical,
          activeVerticalKey: DEFAULT_VERTICAL_KEY,
          analysisTypes: staticAnalysisTypes,
          analysisTypeRegistry: createRegistryFromEntries(staticAnalysisTypes),
          isLoading: false,
          error: null,
        })
        return
      }

      const companyVerticals = await fetchCompanyVerticals(user.company_id)
      const primaryCompanyVertical = companyVerticals.find((cv) => cv.is_primary) || companyVerticals[0]

      let activeVertical: Vertical | null = null
      let activeVerticalKey: VerticalKey = DEFAULT_VERTICAL_KEY

      if (primaryCompanyVertical) {
        activeVertical = verticals.find((v) => v.id === primaryCompanyVertical.vertical_id) || null
        if (activeVertical) {
          activeVerticalKey = activeVertical.key as VerticalKey
        }
      } else {
        activeVertical = verticals.find((v) => v.key === DEFAULT_VERTICAL_KEY) || null
      }

      let analysisTypes: AnalysisTypeEntry[] = []
      if (activeVertical) {
        analysisTypes = await fetchAnalysisTypesForVertical(activeVertical.id)
      }

      if (analysisTypes.length === 0) {
        analysisTypes = getStaticAnalysisTypesForVertical(activeVerticalKey)
      }

      setState({
        verticals,
        companyVerticals,
        activeVertical,
        activeVerticalKey,
        analysisTypes,
        analysisTypeRegistry: createRegistryFromEntries(analysisTypes),
        isLoading: false,
        error: null,
      })
    } catch (error) {
      logError('Error refreshing verticals:', error)
      const staticAnalysisTypes = getStaticAnalysisTypesForVertical(DEFAULT_VERTICAL_KEY)
      setState({
        verticals: [],
        companyVerticals: [],
        activeVertical: null,
        activeVerticalKey: DEFAULT_VERTICAL_KEY,
        analysisTypes: staticAnalysisTypes,
        analysisTypeRegistry: createRegistryFromEntries(staticAnalysisTypes),
        isLoading: false,
        error: error instanceof Error ? error.message : 'Error desconocido',
      })
    }
  }, [fetchVerticals, fetchCompanyVerticals, fetchAnalysisTypesForVertical, user?.company_id])

  const setActiveVertical = useCallback(
    async (verticalKey: VerticalKey) => {
      const vertical = state.verticals.find((v) => v.key === verticalKey)
      if (!vertical) {
        logError('Vertical not found:', verticalKey)
        return
      }

      setState((prev) => ({ ...prev, isLoading: true }))

      try {
        let analysisTypes = await fetchAnalysisTypesForVertical(vertical.id)

        if (analysisTypes.length === 0) {
          analysisTypes = getStaticAnalysisTypesForVertical(verticalKey)
        }

        setState((prev) => ({
          ...prev,
          activeVertical: vertical,
          activeVerticalKey: verticalKey,
          analysisTypes,
          analysisTypeRegistry: createRegistryFromEntries(analysisTypes),
          isLoading: false,
        }))

        if (typeof window !== 'undefined') {
          localStorage.setItem('lims_active_vertical', verticalKey)
        }
      } catch (error) {
        logError('Error setting active vertical:', error)
        const staticAnalysisTypes = getStaticAnalysisTypesForVertical(verticalKey)
        setState((prev) => ({
          ...prev,
          activeVertical: vertical,
          activeVerticalKey: verticalKey,
          analysisTypes: staticAnalysisTypes,
          analysisTypeRegistry: createRegistryFromEntries(staticAnalysisTypes),
          isLoading: false,
        }))
      }
    },
    [state.verticals, fetchAnalysisTypesForVertical]
  )

  const hasAccessToVertical = useCallback(
    (verticalKey: VerticalKey): boolean => {
      const vertical = state.verticals.find((v) => v.key === verticalKey)
      if (!vertical) return false

      if (state.companyVerticals.length === 0) {
        return verticalKey === DEFAULT_VERTICAL_KEY
      }

      return state.companyVerticals.some((cv) => cv.vertical_id === vertical.id && cv.active)
    },
    [state.verticals, state.companyVerticals]
  )

  const getCompanyVerticals = useCallback((): CompanyVertical[] => {
    return state.companyVerticals
  }, [state.companyVerticals])

  useEffect(() => {
    if (isAuthenticated) {
      refreshVerticals()
    } else {
      const staticAnalysisTypes = getStaticAnalysisTypesForVertical(DEFAULT_VERTICAL_KEY)
      setState({
        verticals: [],
        companyVerticals: [],
        activeVertical: null,
        activeVerticalKey: DEFAULT_VERTICAL_KEY,
        analysisTypes: staticAnalysisTypes,
        analysisTypeRegistry: createRegistryFromEntries(staticAnalysisTypes),
        isLoading: false,
        error: null,
      })
    }
  }, [isAuthenticated, refreshVerticals])

  useEffect(() => {
    if (typeof window !== 'undefined' && state.verticals.length > 0) {
      const savedVerticalKey = localStorage.getItem('lims_active_vertical') as VerticalKey | null
      if (savedVerticalKey && hasAccessToVertical(savedVerticalKey) && savedVerticalKey !== state.activeVerticalKey) {
        setActiveVertical(savedVerticalKey)
      }
    }
  }, [state.verticals, hasAccessToVertical, setActiveVertical, state.activeVerticalKey])

  const value: VerticalContextValue = useMemo(
    () => ({
      ...state,
      setActiveVertical,
      refreshVerticals,
      hasAccessToVertical,
      getCompanyVerticals,
    }),
    [state, setActiveVertical, refreshVerticals, hasAccessToVertical, getCompanyVerticals]
  )

  return <VerticalContext.Provider value={value}>{children}</VerticalContext.Provider>
}

export function useVertical() {
  const context = useContext(VerticalContext)
  if (context === undefined) {
    throw new Error('useVertical must be used within a VerticalProvider')
  }
  return context
}

export function useActiveVerticalKey(): VerticalKey {
  const { activeVerticalKey } = useVertical()
  return activeVerticalKey
}

export function useAnalysisTypesForCurrentVertical(): AnalysisTypeEntry[] {
  const { analysisTypes } = useVertical()
  return analysisTypes
}

export function useAnalysisTypeRegistry(): Record<string, AnalysisTypeEntry> {
  const { analysisTypeRegistry } = useVertical()
  return analysisTypeRegistry
}
