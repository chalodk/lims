'use client'

import { useState, type FormEvent } from 'react'
import { useRouter } from 'next/navigation'
import { getSupabaseClient } from '@/lib/supabase/singleton'
import { getPostLoginPath } from '@/lib/auth/postLoginPath'
import { getAuthErrorMessage } from '@/lib/utils/authErrors'

type RoleData = { id: number; name: string } | { id: number; name: string }[]

export function usePasswordLogin() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')

  const router = useRouter()
  const supabase = getSupabaseClient()

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      })

      if (signInError) {
        setError(getAuthErrorMessage(signInError))
        return
      }

      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        router.push('/dashboard')
        return
      }

      const { data: userData } = await supabase
        .from('users')
        .select('role_id, roles(name)')
        .eq('id', user.id)
        .single()

      const roleData = userData?.roles as RoleData | undefined
      const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name
      router.push(getPostLoginPath(roleName))
    } catch (loginError) {
      console.error('Login error:', loginError)
      setError(getAuthErrorMessage(loginError))
    } finally {
      setIsLoading(false)
    }
  }

  return {
    email,
    setEmail,
    password,
    setPassword,
    isLoading,
    showPassword,
    setShowPassword,
    error,
    handleSubmit,
  }
}
