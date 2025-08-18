import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { User, Role, UserRole } from '@/types/database'
import type { User as AuthUser, Session } from '@supabase/supabase-js'

interface AuthState {
  user: User | null
  authUser: AuthUser | null
  role: Role | null
  userRole: UserRole | null
  isLoading: boolean
  isAuthenticated: boolean
}

export function useAuth() {
  const [state, setState] = useState<AuthState>({
    user: null,
    authUser: null,
    role: null,
    userRole: null,
    isLoading: true,
    isAuthenticated: false,
  })

  // Create client only once
  const supabase = useState(() => createClient())[0]

  useEffect(() => {
    let mounted = true

    const updateAuthState = async (session: Session | null) => {
      if (!mounted) return

      if (!session?.user || !session?.access_token) {
        console.log('No valid session, clearing auth state')
        setState({
          user: null,
          authUser: null,
          role: null,
          userRole: null,
          isLoading: false,
          isAuthenticated: false,
        })
        return
      }

      console.log('Valid session found, updating auth state')
      setState({
        user: null,
        authUser: session.user,
        role: null,
        userRole: 'admin', // Default role for now
        isLoading: false,
        isAuthenticated: true,
      })
    }

    const initializeAuth = async () => {
      try {
        console.log('Initializing auth...')
        
        // First, try to get the current session
        const { data: { session }, error: sessionError } = await supabase.auth.getSession()
        
        if (sessionError) {
          console.error('Session error:', sessionError)
          await updateAuthState(null)
          return
        }

        if (session) {
          console.log('Found existing session')
          await updateAuthState(session)
        } else {
          console.log('No existing session')
          await updateAuthState(null)
        }
      } catch (error) {
        console.error('Error initializing auth:', error)
        await updateAuthState(null)
      }
    }

    initializeAuth()

    // Set up auth state listener
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      console.log('Auth state change:', event, !!session?.user, session?.access_token ? 'has token' : 'no token')
      
      if (event === 'SIGNED_OUT') {
        console.log('User signed out')
        await updateAuthState(null)
      } else if (event === 'SIGNED_IN') {
        console.log('User signed in')
        await updateAuthState(session)
      } else if (event === 'TOKEN_REFRESHED') {
        console.log('Token refreshed successfully')
        await updateAuthState(session)
      } else if (event === 'USER_UPDATED') {
        console.log('User updated')
        await updateAuthState(session)
      } else if (event === 'PASSWORD_RECOVERY') {
        console.log('Password recovery event')
      }
    })

    // Periodic session validation (every 30 seconds)
    const sessionCheckInterval = setInterval(async () => {
      if (!mounted) return
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        
        if (error) {
          console.warn('Session check error:', error)
          await updateAuthState(null)
          return
        }

        // Check if session is still valid
        if (session && session.expires_at) {
          const expiresAt = new Date(session.expires_at * 1000)
          const now = new Date()
          
          // If session expires in less than 5 minutes, try to refresh
          if (expiresAt.getTime() - now.getTime() < 5 * 60 * 1000) {
            console.log('Session expiring soon, attempting refresh...')
            const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession()
            
            if (refreshError) {
              console.error('Session refresh failed:', refreshError)
              await updateAuthState(null)
            } else {
              console.log('Session refreshed successfully')
              await updateAuthState(refreshData.session)
            }
          }
        }
      } catch (error) {
        console.error('Session check failed:', error)
      }
    }, 30000) // Check every 30 seconds

    return () => {
      mounted = false
      subscription.unsubscribe()
      clearInterval(sessionCheckInterval)
    }
  }, [supabase.auth])

  const signOut = async () => {
    try {
      console.log('Starting signOut process...')
      setState(prev => ({ ...prev, isLoading: true }))
      
      // Multiple logout strategies to ensure it works
      const logoutStrategies = [
        // Strategy 1: Standard signOut
        () => supabase.auth.signOut(),
        // Strategy 2: Force signOut with scope
        () => supabase.auth.signOut({ scope: 'global' }),
        // Strategy 3: Clear session manually
        () => {
          // Clear all auth-related localStorage
          if (typeof window !== 'undefined') {
            Object.keys(localStorage).forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                localStorage.removeItem(key)
              }
            })
            // Clear all sessionStorage
            Object.keys(sessionStorage).forEach(key => {
              if (key.startsWith('sb-') || key.includes('supabase')) {
                sessionStorage.removeItem(key)
              }
            })
          }
          return Promise.resolve({ error: null })
        }
      ]
      
      // Try each strategy with timeout
      for (const strategy of logoutStrategies) {
        try {
          const timeoutPromise = new Promise((_, reject) => {
            setTimeout(() => reject(new Error('Strategy timeout')), 3000)
          })
          
          const result = await Promise.race([strategy(), timeoutPromise])
          const { error } = result as { error: Error | null }
          
          if (!error) {
            console.log('Logout strategy succeeded')
            break
          }
        } catch (strategyError) {
          console.warn('Logout strategy failed:', strategyError)
          continue
        }
      }
      
      // Force clear state regardless of strategy success
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
      })
      
      console.log('Redirecting to login...')
      // Force immediate redirect
      window.location.replace('/login')
    } catch (error) {
      console.error('Error in signOut:', error)
      // Clear everything and redirect anyway
      setState({
        user: null,
        authUser: null,
        role: null,
        userRole: null,
        isLoading: false,
        isAuthenticated: false,
      })
      window.location.replace('/login')
    }
  }

  return {
    ...state,
    signOut,
  }
}