'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { Loader2 } from 'lucide-react'
import Image from 'next/image'

export default function HomePage() {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(true)
  const supabase = createClient()

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user) {
          router.push('/dashboard')
        } else {
          router.push('/login')
        }
      } catch (error) {
        console.error('Auth check failed:', error)
        router.push('/login')
      } finally {
        setIsLoading(false)
      }
    }

    checkAuth()
  }, [router, supabase.auth])

  if (!isLoading) {
    return null // Will redirect, so don't show anything
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="text-center space-y-4">
        <Image
          src={
            'https://mknzstzwhbfoyxzfudfw.supabase.co/storage/v1/object/public/images/ORG_logo_NEMACHILE_(R)_01.08.23.ai.png'
          }
          alt="Logo"
          width={160}
          height={160}
          className="mx-auto w-40 h-40"
          priority
        />
        <h1 className="text-2xl font-bold text-gray-900">LIMS</h1>
        <p className="text-gray-600">Sistema de Gestión de Laboratorio</p>
        <Loader2 className="h-6 w-6 animate-spin mx-auto text-indigo-600" />
        <p className="text-sm text-gray-500">Cargando...</p>
      </div>
    </div>
  )
}