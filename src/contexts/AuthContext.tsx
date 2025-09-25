'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Role, RoleName } from '@/types/database'
import type { User as AuthUser, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  authUser: AuthUser | null
  role: Role | null
  userRole: RoleName | null
  isLoading: boolean
  isAuthenticated: boolean
  session: Session | null
}

interface AuthContextValue extends AuthState {
  signOut: () => Promise<void>
  refreshSession: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined)

// Session cache duration (30 minutes) - much longer to reduce unnecessary DB queries
const SESSION_CACHE_DURATION = 30 * 60 * 1000

// Retry configuration for database queries
const MAX_RETRIES = 2
const RETRY_DELAY = 1000

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    role: null,
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
    session: null,
  })
  
  const [lastSessionCheck, setLastSessionCheck] = useState<number>(0)
  const supabase = createClient()

  const updateAuthState = useCallback(async (session: Session | null, forceRefresh = false) => {
    if (!session?.user || !session?.access_token) {
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      return
    }

    // Check if we need to refresh user data
    const now = Date.now()
    const shouldRefreshUserData = forceRefresh || 
      !state.user || 
      state.user.id !== session.user.id ||
      (now - lastSessionCheck) > SESSION_CACHE_DURATION

    if (!shouldRefreshUserData && state.user) {
      // Use cached data but always update session
      setState(prev => ({
        ...prev,
        session,
        authUser: session.user,
        isLoading: false,
        isAuthenticated: true,
      }))
      return
    }

    // If we have a valid user but just need to update session, skip DB query
    if (state.user && state.user.id === session.user.id && !forceRefresh) {
      setState(prev => ({
        ...prev,
        session,
        authUser: session.user,
        isLoading: false,
        isAuthenticated: true,
      }))
      return
    }

    // Check if we should skip DB query entirely (fallback mode)
    const shouldSkipDBQuery = state.user && 
      state.user.id === session.user.id && 
      (now - lastSessionCheck) < SESSION_CACHE_DURATION

    if (shouldSkipDBQuery) {
      console.log('Skipping DB query, using cached user data')
      setState(prev => ({
        ...prev,
        session,
        authUser: session.user,
        isLoading: false,
        isAuthenticated: true,
      }))
      return
    }

    try {
      // Try to fetch user data with retry logic
      let userData: User | null = null
      let userError: { message: string } | null = null
      
      for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
        try {
          const userQuery = supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .single()

          // Longer timeout to prevent premature failures
          const userQueryWithTimeout = Promise.race([
            userQuery,
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('User query timeout')), 10000)
            )
          ])

          const result = await userQueryWithTimeout as { data: User | null, error: { message: string } | null }
          userData = result.data
          userError = result.error
          
          // If successful, break out of retry loop
          if (!userError) break
          
          // If not the last attempt, wait before retrying
          if (attempt < MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
          }
        } catch (retryError) {
          if (attempt === MAX_RETRIES) {
            throw retryError
          }
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, RETRY_DELAY))
        }
      }

      if (userError) {
        console.warn('User query failed, using auth user only:', userError.message)
        // Don't fail the entire auth process - use auth user data
        setState({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
            company_id: null,
            client_id: null,
            specialization: null,
            avatar: null,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
            role_id: null
          },
          authUser: session.user,
          role: null,
          userRole: 'admin', // Default role for now
          isLoading: false,
          isAuthenticated: true,
          session,
        })
        return
      }

      setState({
        user: userData,
        authUser: session.user,
        role: null,
        userRole: 'admin', // Default role for now
        isLoading: false,
        isAuthenticated: true,
        session,
      })
      
      setLastSessionCheck(now)
    } catch (error) {
      console.error('Error in updateAuthState:', error)
      
      // If it's a timeout error, don't fail the auth - just use auth user data
      if (error instanceof Error && error.message.includes('timeout')) {
        console.warn('Database query timed out, using auth user data only')
        setState({
          user: {
            id: session.user.id,
            email: session.user.email || '',
            name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
            company_id: null,
            client_id: null,
            specialization: null,
            avatar: null,
            created_at: session.user.created_at || new Date().toISOString(),
            updated_at: session.user.updated_at || new Date().toISOString(),
            role_id: null
          },
          authUser: session.user,
          role: null,
          userRole: 'admin', // Default role for now
          isLoading: false,
          isAuthenticated: true,
          session,
        })
        return
      }
      
      // For other errors, still try to maintain auth state
      setState({
        user: {
          id: session.user.id,
          email: session.user.email || '',
          name: session.user.user_metadata?.name || session.user.email?.split('@')[0] || 'Usuario',
          company_id: null,
          client_id: null,
          specialization: null,
          avatar: null,
          created_at: session.user.created_at || new Date().toISOString(),
          updated_at: session.user.updated_at || new Date().toISOString(),
          role_id: null
        },
        authUser: session.user,
        role: null,
        userRole: 'admin', // Default role for now
        isLoading: false,
        isAuthenticated: true,
        session,
      })
    }
  }, [state.user, lastSessionCheck, supabase])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Session refresh error:', error)
        await updateAuthState(null)
        return
      }
      await updateAuthState(session, true)
    } catch (error) {
      console.error('Error refreshing session:', error)
      await updateAuthState(null)
    }
  }, [supabase, updateAuthState])

  useEffect(() => {
    let mounted = true
    let refreshInterval: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          if (mounted) await updateAuthState(null)
          return
        }

        if (mounted) {
          await updateAuthState(session)
          
          // Set up periodic session refresh (every 15 minutes)
          if (session?.user) {
            refreshInterval = setInterval(async () => {
              if (mounted) {
                try {
                  const { data: { session: currentSession } } = await supabase.auth.getSession()
                  if (currentSession?.user) {
                    await updateAuthState(currentSession)
                  }
                } catch (error) {
                  console.error('Periodic session refresh error:', error)
                }
              }
            }, 15 * 60 * 1000) // 15 minutes
          }
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) await updateAuthState(null)
      }
    }

    initializeAuth()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      
      console.log('Auth state change:', event)
      
      if (event === 'SIGNED_OUT') {
        await updateAuthState(null)
      } else if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED' || event === 'USER_UPDATED') {
        await updateAuthState(session, true)
      } else if (event === 'INITIAL_SESSION') {
        // Handle initial session properly
        if (session?.user && session?.access_token) {
          await updateAuthState(session)
        } else {
          await updateAuthState(null)
        }
      } else if (session?.user && session?.access_token) {
        await updateAuthState(session)
      }
    })

    return () => {
      mounted = false
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      subscription.unsubscribe()
    }
  }, [supabase, updateAuthState])

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('SignOut error:', error)
      }
      
      // Clear local storage
      if (typeof window !== 'undefined') {
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase')) {
            localStorage.removeItem(key)
          }
        })
      }
      
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      
      window.location.replace('/login')
    } catch (error) {
      console.error('Error in signOut:', error)
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      window.location.replace('/login')
    }
  }

  const value: AuthContextValue = {
    ...state,
    signOut,
    refreshSession,
  }

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}