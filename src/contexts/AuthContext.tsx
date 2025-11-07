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
      // Try to fetch user data from database with role information
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select(`
          *,
          roles (
            id,
            name,
            level,
            description
          )
        `)
        .eq('id', session.user.id)
        .single()

      if (userError) {
        logError('❌ User query failed, user not found in database:', userError.message)
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
        return
      }

      // Extract role information
      let role: Role | null = null
      let userRole: RoleName | null = null

      if (userData.role_id && userData.roles) {
        // Handle both array and object formats from Supabase
        const roleData = Array.isArray(userData.roles) 
          ? userData.roles[0] 
          : userData.roles

        if (roleData) {
          role = {
            id: roleData.id,
            name: roleData.name as RoleName,
            level: roleData.level || 0,
            description: roleData.description || null,
            created_at: roleData.created_at || null,
          }
          userRole = roleData.name as RoleName
        }
      }

      console.log('✅ Setting authenticated state for user:', userData.email)
      console.log('📋 Role information:', { role, userRole, role_id: userData.role_id })

      // Clean up userData to remove the roles relation (we store it separately)
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { roles: _, ...cleanUserData } = userData

      setState({
        user: cleanUserData,
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('SignOut error:', error)
        // Continue with logout even if Supabase signOut fails
      }
      
      // Clear local storage and session storage
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
          // Continue with redirect even if storage clearing fails
        }
        
        // Multiple redirect methods for reliability
        const redirectToLogin = () => {
          try {
            // Method 1: window.location.href (most reliable)
            window.location.href = '/login'
          } catch (e) {
            try {
              // Method 2: window.location.replace (fallback)
              window.location.replace('/login')
            } catch (e2) {
              try {
                // Method 3: window.location.assign (last resort)
                window.location.assign('/login')
              } catch (e3) {
                console.error('All redirect methods failed:', e3)
                // Force page reload as absolute last resort
                window.location.reload()
              }
            }
          }
        }
        
        // Redirect immediately
        redirectToLogin()
        
        // Safety timeout: if redirect doesn't work within 2 seconds, force it
        setTimeout(() => {
          if (window.location.pathname !== '/login') {
            console.warn('Redirect timeout, forcing redirect to login')
            redirectToLogin()
          }
        }, 2000)
      }
      
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
        try {
          window.location.href = '/login'
        } catch (redirectError) {
          console.error('Redirect error:', redirectError)
          // Last resort: reload page
          window.location.reload()
        }
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