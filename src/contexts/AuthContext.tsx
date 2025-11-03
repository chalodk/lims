'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { getSupabaseClient } from '@/lib/supabase/singleton'
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

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    role: null,
    userRole: null,
    isLoading: false,
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
    console.log('🔍 updateAuthState called with session:', !!session)
    console.log('📋 Session details:', { 
      user: session?.user?.email, 
      access_token: !!session?.access_token 
    })
    
    if (!session?.user || !session?.access_token) {
      console.log('❌ No valid session, setting unauthenticated state')
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
      // Try to fetch user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.error('❌ User query failed, user not found in database:', userError.message)
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

      console.log('✅ Setting authenticated state for user:', userData.email)
      setState({
        user: userData,
        authUser: session.user,
        role: null,
        userRole: 'admin', // Default role for now
        isLoading: false,
        isAuthenticated: true,
        session,
      })
    } catch (error) {
      console.error('❌ Error in updateAuthState:', error)
      
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
        console.error('Session refresh error:', error)
        await updateAuthState(null)
        return
      }
      await updateAuthState(session)
    } catch (error) {
      console.error('Error refreshing session:', error)
      await updateAuthState(null)
    }
  }, [supabase, updateAuthState])

  useEffect(() => {
    let mounted = true

    // Check if Supabase is properly configured
    if (!isSupabaseConfigured()) {
      console.error('Supabase environment variables not configured properly')
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
        console.log('Initializing auth...')
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (sessionError) {
          console.error('Session error:', sessionError)
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
          console.log('Session found:', !!session)
          await updateAuthState(session)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
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
      console.log('Auth state change:', event, 'Session:', !!session)
      
      // Only handle specific events to avoid race conditions
      if (event === 'SIGNED_IN' || event === 'SIGNED_OUT' || event === 'TOKEN_REFRESHED') {
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
      
      // Sign out from Supabase
      const { error } = await supabase.auth.signOut()
      
      if (error) {
        console.error('SignOut error:', error)
      }
      
      // Clear state
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
        session: null,
      })
      
      // Redirect to login
      if (typeof window !== 'undefined') {
        window.location.href = '/login'
      }
      
    } catch (error) {
      console.error('Error in signOut:', error)
      
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
        window.location.href = '/login'
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