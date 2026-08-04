'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useAuth } from '@/hooks/useAuth'

export default function HomePage() {
  const router = useRouter()
  const { userRole, isLoading } = useAuth()

  useEffect(() => {
    // Esperar a que se cargue la autenticación
    if (!isLoading) {
      // Redirigir según el rol: consumidor va a /cliente, otros a /dashboard
      if (userRole === 'consumidor') {
        router.replace('/cliente')
      } else {
        router.replace('/dashboard')
      }
    }
  }, [router, userRole, isLoading])

  return null
}