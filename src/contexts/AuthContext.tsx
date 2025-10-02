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

// Extended session cache duration (15 minutes) - rely more on session tokens
const SESSION_CACHE_DURATION = 15 * 60 * 1000

// Only query database in these cases
const FORCE_DB_QUERY_EVENTS = ['SIGNED_IN', 'USER_UPDATED']

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

  const updateAuthState = useCallback(async (session: Session | null, forceRefresh = false, eventType = '') => {
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

    const now = Date.now()
    
    // Always update session and auth state first - rely on session validation
    const baseAuthState = {
      session,
      authUser: session.user,
      isLoading: false,
      isAuthenticated: true,
    }

    // If we have cached user data and session is valid, use it
    if (state.user && state.user.id === session.user.id && !forceRefresh) {
      setState(prev => ({
        ...prev,
        ...baseAuthState,
      }))
      
      // Only query database if cache is very old or for critical events
      const cacheAge = now - lastSessionCheck
      const shouldQueryDB = forceRefresh || 
        cacheAge > SESSION_CACHE_DURATION ||
        FORCE_DB_QUERY_EVENTS.includes(eventType)
        
      if (!shouldQueryDB) {
        return
      }
    }

    // Create fallback user data from session
    const fallbackUser: User = {
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
    }

    // If no cached user, set fallback immediately to prevent logout
    if (!state.user || state.user.id !== session.user.id) {
      setState({
        user: fallbackUser,
        authUser: session.user,
        role: null,
        userRole: 'admin', // Default role
        isLoading: false,
        isAuthenticated: true,
        session,
      })
    }

    // Try to fetch user data from database (optional enhancement)
    try {
      const userQuery = supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Longer timeout but still reasonable (15 seconds)
      const userQueryWithTimeout = Promise.race([
        userQuery,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout')), 15000)
        )
      ])

      const result = await userQueryWithTimeout as { data: User | null, error: { message: string } | null }
      
      if (!result.error && result.data) {
        // Successfully got user data from database
        setState(prev => ({
          ...prev,
          user: result.data,
          userRole: 'admin', // Default role for now
          ...baseAuthState,
        }))
        setLastSessionCheck(now)
      } else {
        // Database query failed, but keep using fallback user (no logout)
        console.warn('User query failed, continuing with session-based auth:', result.error?.message)
      }
    } catch (error) {
      // Database timeout or error - don't reset auth state, just log
      console.warn('Database query failed, continuing with session-based auth:', error)
      // Auth state is already set with fallback user, no need to reset
    }
  }, [state.user, lastSessionCheck, supabase])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        console.error('Session refresh error:', error)
        // Don't reset auth state on refresh errors, just log
        return
      }
      // Don't force refresh, just validate session
      await updateAuthState(session, false, 'MANUAL_REFRESH')
    } catch (error) {
      console.error('Error refreshing session:', error)
      // Don't reset auth state on refresh errors
    }
  }, [supabase, updateAuthState])

  useEffect(() => {
    let mounted = true
    let refreshInterval: NodeJS.Timeout | null = null
    let initializationTimeout: NodeJS.Timeout | null = null

    const initializeAuth = async () => {
      try {
        // Set a maximum timeout for the entire initialization process
        initializationTimeout = setTimeout(() => {
          if (mounted) {
            console.warn('Auth initialization timed out after 10 seconds, redirecting to login')
            setState({
              user: null,
              authUser: null,
              role: null,
              userRole: null,
              isLoading: false,
              isAuthenticated: false,
              session: null,
            })
            // Force redirect to login on timeout
            if (typeof window !== 'undefined') {
              window.location.href = '/login'
            }
          }
        }, 10000) // 10 second maximum for entire auth initialization

        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        // Clear the timeout since we got a response
        if (initializationTimeout) {
          clearTimeout(initializationTimeout)
          initializationTimeout = null
        }
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          await updateAuthState(null)
          return
        }

        await updateAuthState(session, false, 'INITIAL_SESSION')
        
        // Set up periodic session refresh (every 30 minutes) with less aggressive refresh
        if (session?.user) {
          refreshInterval = setInterval(async () => {
            if (mounted) {
              try {
                const { data: { session: currentSession } } = await supabase.auth.getSession()
                if (currentSession?.user) {
                  // Don't force refresh, just validate session
                  await updateAuthState(currentSession, false, 'PERIODIC_REFRESH')
                }
              } catch (error) {
                console.warn('Periodic session refresh error (non-critical):', error)
                // Don't reset auth state on periodic refresh errors
              }
            }
          }, 30 * 60 * 1000) // 30 minutes - less frequent
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
          // Clear timeout and set unauthenticated state on error
          if (initializationTimeout) {
            clearTimeout(initializationTimeout)
            initializationTimeout = null
          }
          await updateAuthState(null)
        }
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
      } else if (event === 'SIGNED_IN') {
        // Force refresh on sign in to get latest user data
        await updateAuthState(session, true, event)
      } else if (event === 'USER_UPDATED') {
        // Force refresh when user profile is updated
        await updateAuthState(session, true, event)
      } else if (event === 'TOKEN_REFRESHED') {
        // Don't force refresh on token refresh, just update session
        await updateAuthState(session, false, event)
      } else if (event === 'INITIAL_SESSION') {
        // Handle initial session properly
        if (session?.user && session?.access_token) {
          await updateAuthState(session, false, event)
        } else {
          await updateAuthState(null)
        }
      } else if (session?.user && session?.access_token) {
        await updateAuthState(session, false, event)
      }
    })

    return () => {
      mounted = false
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
      if (initializationTimeout) {
        clearTimeout(initializationTimeout)
      }
      subscription.unsubscribe()
    }
  }, [supabase, updateAuthState])

  const signOut = async () => {
    try {
      setState(prev => ({ ...prev, isLoading: true }))
      
      // Force logout with global scope
      const { error } = await supabase.auth.signOut({ scope: 'global' })
      
      if (error) {
        console.error('SignOut error:', error)
      }
      
      // Clear all storage more aggressively
      if (typeof window !== 'undefined') {
        // Clear localStorage
        Object.keys(localStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            localStorage.removeItem(key)
          }
        })
        
        // Clear sessionStorage
        Object.keys(sessionStorage).forEach(key => {
          if (key.startsWith('sb-') || key.includes('supabase') || key.includes('auth')) {
            sessionStorage.removeItem(key)
          }
        })
        
        // Clear cookies more aggressively
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
        })
      }
      
      // Immediate state reset
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      
      // Force redirect with timeout fallback
      setTimeout(() => {
        window.location.href = '/login'
      }, 100)
      
    } catch (error) {
      console.error('Error in signOut:', error)
      
      // Force clear everything on error
      if (typeof window !== 'undefined') {
        localStorage.clear()
        sessionStorage.clear()
        
        // Clear cookies
        document.cookie.split(";").forEach(function(c) { 
          document.cookie = c.replace(/^ +/, "").replace(/=.*/, "=;expires=" + new Date().toUTCString() + ";path=/"); 
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
      
      // Force redirect
      window.location.href = '/login'
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