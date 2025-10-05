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
  
  const supabase = createClient()

  const updateAuthState = useCallback(async (session: Session | null) => {
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

    try {
      // Fetch user data from database
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('*')
        .eq('id', session.user.id)
        .single()

      if (userError) {
        console.warn('User query failed, using auth user only:', userError.message)
        // Use auth user data as fallback
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
          userRole: 'consumidor', // Default role
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
    } catch (error) {
      console.error('Error in updateAuthState:', error)
      
      // Use auth user data as fallback
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
        userRole: 'consumidor', // Default role
        isLoading: false,
        isAuthenticated: true,
        session,
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

    const initializeAuth = async () => {
      try {
        // Get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (!mounted) return
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          await updateAuthState(null)
        } else {
          await updateAuthState(session)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        if (mounted) {
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
      await updateAuthState(session || null)
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
      
      // Force redirect
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

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider')
  }
  return context
}