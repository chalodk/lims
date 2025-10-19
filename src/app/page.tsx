'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'

export default function HomePage() {
  const router = useRouter()

  useEffect(() => {
    // Redirección inmediata - el middleware ya maneja la autenticación
    router.replace('/dashboard')
  }, [router])

  return null
}