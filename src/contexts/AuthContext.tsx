'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { User, Role, RoleName } from '@/types/database'
import type { User as AuthUser, Session } from '@supabase/supabase-js'
import { log, logError } from '@/lib/utils/logger'
import { TOKEN_REFRESH_THRESHOLD_SECONDS, TOKEN_REFRESH_CHECK_INTERVAL_MS } from '@/lib/auth/constants'

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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    role: null,
    userRole: null,
    isLoading: true, // ✅ Cambiar a true - aún no sabemos si hay sesión
    isAuthenticated: false,
    session: null,
  })
  
  const supabase = getSupabaseClient()

  // Check if environment variables are properly configured
  const isSupabaseConfigured = () => {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL
    const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
    return !!(url && key && url !== 'undefined' && key !== 'undefined')
  }


  const updateAuthState = useCallback(async (session: Session | null) => {
    log('🔍 updateAuthState called with session:', !!session)
    log('📋 Session details:', { 
      user: session?.user?.email, 
      access_token: !!session?.access_token 
    })
    
    if (!session?.user || !session?.access_token) {
      log('❌ No valid session, setting unauthenticated state')
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

    try {
      console.log('🔍 Trying to fetch user data from database for:', session.user.id)
      
      // First, try to fetch user data without the roles join to see if that's the issue
      // Add timeout to prevent hanging queries (5 seconds)
      const userQueryPromise = supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error('Query timeout: User data fetch took too long'))
        }, 5000) // 5 second timeout
      })

      let userData: User | null = null
      let userError: { message: string } | null = null

      try {
        const result = await Promise.race([
          userQueryPromise,
          timeoutPromise
        ]) as { data: User | null; error: { message: string } | null }
        userData = result.data
        userError = result.error
      } catch (timeoutError) {
        logError('❌ Query timeout or error:', timeoutError instanceof Error ? timeoutError.message : 'Unknown error')
        userError = { message: timeoutError instanceof Error ? timeoutError.message : 'Query timeout' }
      }

      // ✅ CRÍTICO: Si hay sesión válida, el usuario ESTÁ autenticado
      // Los datos de BD son complementarios, no determinan la autenticación
      // Si falla la consulta, mantenemos autenticado pero con datos parciales
      if (userError || !userData) {
        logError('❌ User query failed, but user has valid session. Continuing with partial data:', userError?.message || 'No data returned')
        // Mantener autenticado basado en la sesión, pero con datos mínimos
        setState({
          user: null, // No hay datos de BD, pero el usuario está autenticado
          authUser: session.user, // ✅ Mantener authUser de la sesión
          role: null,
          userRole: null,
          isLoading: false,
          isAuthenticated: true, // ✅ CRÍTICO: Mantener autenticado si hay sesión válida
          session, // ✅ Mantener la sesión
        })
        return
      }

      // Now fetch role information separately if role_id exists
      let role: Role | null = null
      let userRole: RoleName | null = null

      if (userData.role_id) {
        try {
          const roleQueryPromise = supabase
            .from('roles')
            .select('id, name, level, description, created_at')
            .eq('id', userData.role_id)
            .single()

          const roleTimeoutPromise = new Promise((_, reject) => {
            setTimeout(() => {
              reject(new Error('Query timeout: Role data fetch took too long'))
            }, 3000) // 3 second timeout for role
          })

          const { data: roleData, error: roleError } = await Promise.race([
            roleQueryPromise,
            roleTimeoutPromise
          ]) as { data: Role | null; error: { message: string } | null }

          if (!roleError && roleData) {
            role = {
              id: roleData.id,
              name: roleData.name as RoleName,
              level: roleData.level || 0,
              description: roleData.description || null,
              created_at: roleData.created_at || null,
            }
            userRole = roleData.name as RoleName
          } else {
            logError('❌ Role query failed:', roleError?.message || 'Unknown error')
          }
        } catch (roleErr) {
          logError('❌ Error fetching role:', roleErr)
          // Continue without role - user can still be authenticated
        }
      }

      console.log('✅ Setting authenticated state for user:', userData.email)
      console.log('📋 Role information:', { role, userRole, role_id: userData.role_id })

      setState({
        user: userData,
        authUser: session.user,
        role,
        userRole,
        isLoading: false,
        isAuthenticated: true,
        session,
      })
    } catch (error) {
      logError('❌ Error in updateAuthState:', error)
      
      // No fallback user - user must exist in database
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
    }
  }, [supabase])

  const refreshSession = useCallback(async () => {
    try {
      const { data: { session }, error } = await supabase.auth.getSession()
      if (error) {
        logError('Session refresh error:', error)
        await updateAuthState(null)
        return
      }
      await updateAuthState(session)
    } catch (error) {
      logError('Error refreshing session:', error)
      await updateAuthState(null)
    }
  }, [supabase, updateAuthState])

  useEffect(() => {
    let mounted = true
    const refreshIntervalRef = { current: null as NodeJS.Timeout | null }

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      logError('Supabase environment variables not configured properly')
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

    // Initialize auth state
    const initializeAuth = async () => {
      try {
        log('Initializing auth...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (sessionError) {
          logError('Session error:', sessionError)
          setState({
            user: null,
            authUser: null,
            role: null,
            userRole: null,
            isLoading: false,
            isAuthenticated: false,
            session: null,
          })
        } else {
          log('Session found:', !!session)
          await updateAuthState(session)
        }
      } catch (error) {
        logError('Error initializing auth:', error)
        if (mounted) {
          setState({
            user: null,
            authUser: null,
            role: null,
            userRole: null,
            isLoading: false,
            isAuthenticated: false,
            session: null,
          })
        }
      }
    }

    initializeAuth()

    // Set up auth state listener - this is the single source of truth
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return
      log('Auth state change:', event, 'Session:', !!session)
      
      // Handle SIGNED_OUT immediately without calling updateAuthState
      // to avoid race conditions during logout
      if (event === 'SIGNED_OUT') {
        console.log('🔄 SIGNED_OUT event detected, clearing state')
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
      
      // Only handle specific events to avoid race conditions
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        await updateAuthState(session)
      }
    })

    // Set up proactive token refresh
    // Check periodically if the token is close to expiring and refresh it proactively
    refreshIntervalRef.current = setInterval(async () => {
      if (!mounted) {
        // Clean up interval if component is unmounted
        if (refreshIntervalRef.current) {
          clearInterval(refreshIntervalRef.current)
          refreshIntervalRef.current = null
        }
        return
      }
      
      try {
        const { data: { session } } = await supabase.auth.getSession()
        if (session) {
          // Get the token expiration time
          const expiresAt = session.expires_at
          if (expiresAt) {
            const expiresInSeconds = expiresAt - Math.floor(Date.now() / 1000)
            // Refresh if less than TOKEN_REFRESH_THRESHOLD_SECONDS until expiration
            if (expiresInSeconds < TOKEN_REFRESH_THRESHOLD_SECONDS && expiresInSeconds > 0) {
              log('🔄 Proactively refreshing token (expires in', expiresInSeconds, 'seconds)')
              await supabase.auth.refreshSession()
            }
          }
        }
      } catch (error) {
        logError('Error in proactive refresh:', error)
      }
    }, TOKEN_REFRESH_CHECK_INTERVAL_MS)

    return () => {
      mounted = false
      subscription.unsubscribe()
      if (refreshIntervalRef.current) {
        clearInterval(refreshIntervalRef.current)
        refreshIntervalRef.current = null
      }
    }
  }, [supabase, updateAuthState])

  const signOut = async () => {
    try {
      // Sign out from Supabase first (but don't wait for it to complete)
      const signOutPromise = supabase.auth.signOut().catch(err => {
        console.error('SignOut error:', err)
        // Continue with logout even if Supabase signOut fails
      })
      
      // Clear state immediately for better UX
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      
      // Clear local storage and session storage immediately
      if (typeof window !== 'undefined') {
        try {
          // Clear Supabase auth data
          Object.keys(localStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              localStorage.removeItem(key)
            }
          })
          
          Object.keys(sessionStorage).forEach(key => {
            if (key.startsWith('sb-') || key.includes('supabase')) {
              sessionStorage.removeItem(key)
            }
          })
        } catch (storageError) {
          console.error('Error clearing storage:', storageError)
        }
        
        // Redirect immediately - don't wait for Supabase signOut to complete
        // Use window.location.replace to avoid adding to history
              window.location.replace('/login')
      }
      
      // Wait for signOut to complete in background (but don't block)
      await signOutPromise
      
    } catch (error) {
      logError('Error in signOut:', error)
      
      // Clear state even on error
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      
      // Redirect to login even on error
      if (typeof window !== 'undefined') {
        window.location.replace('/login')
      }
    }
  }

  const value: AuthContextValue = {
    ...state,
    signOut,
    refreshSession,
  }

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}