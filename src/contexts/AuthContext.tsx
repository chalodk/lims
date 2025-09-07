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

// Session cache duration (5 minutes)
const SESSION_CACHE_DURATION = 5 * 60 * 1000

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
      // Use cached data
      setState(prev => ({
        ...prev,
        session,
        authUser: session.user,
        isLoading: false,
      }))
      return
    }

    try {
      // Fetch user data from the users table with timeout
      const userQuery = supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      // Add timeout to prevent hanging
      const userQueryWithTimeout = Promise.race([
        userQuery,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('User query timeout')), 5000)
        )
      ])

      const result = await userQueryWithTimeout as { data: User | null, error: { message: string } | null }
      const { data: userData, error: userError } = result

      if (userError) {
        console.warn('User not found in users table, using auth user only:', userError.message)
        // User exists in auth but not in users table - this is OK for now
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
      // Fallback to auth user only
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
    const { data: { user } } = await supabase.auth.getUser()
    const session = user ? { user, access_token: 'validated' } as Session : null
    await updateAuthState(session, true)
  }, [supabase, updateAuthState])

  useEffect(() => {
    let mounted = true

    const initializeAuth = async () => {
      try {
        // Use getUser() instead of getSession() for security
        const { data: { user }, error: userError } = await supabase.auth.getUser()
        
        if (userError) {
          console.error('User error:', userError)
          if (mounted) await updateAuthState(null)
          return
        }

        if (mounted) {
          // Create a session-like object for compatibility
          const session = user ? { user, access_token: 'validated' } as Session : null
          await updateAuthState(session)
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
      } else if (session?.user && session?.access_token) {
        await updateAuthState(session)
      }
    })

    return () => {
      mounted = false
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