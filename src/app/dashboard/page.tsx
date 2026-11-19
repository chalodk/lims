'use client'

import { useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import DashboardLayout from '@/components/layout/DashboardLayout'
import { useAuth } from '@/hooks/useAuth'
import { useSessionVertical } from '@/hooks/useSessionVertical'
import CsxDashboard from '@/app/dashboard/CsxDashboard'
import PestDashboard from '@/app/dashboard/PestDashboard'
import SoilDashboard from '@/app/dashboard/SoilDashboard'

export default function DashboardPage() {
  const router = useRouter()
  const { userRole, isLoading: authLoading } = useAuth()
  const isConsumer = userRole === 'consumidor'
  const isCsx = userRole === 'csx'
  const {
    vertical,
    isLoading: verticalLoading,
    error: verticalError,
    refresh,
  } = useSessionVertical(!authLoading && Boolean(userRole) && !isConsumer && !isCsx)

  useEffect(() => {
    if (!authLoading && isConsumer) {
      router.replace('/cliente')
    }
  }, [authLoading, isConsumer, router])

  if (isConsumer) {
    return null
  }

  let body
  if (authLoading || !userRole) {
    body = (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  } else if (isCsx) {
    body = <CsxDashboard />
  } else if (verticalLoading) {
    body = (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-green-600" />
      </div>
    )
  } else if (verticalError) {
    body = (
      <div className="mx-auto max-w-xl p-6">
        <div className="space-y-4 rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          <p>No se pudo confirmar la vertical del laboratorio. Reintenta para ver el dashboard.</p>
          <Button type="button" variant="outline" onClick={() => void refresh()}>
            Reintentar
          </Button>
        </div>
      </div>
    )
  } else if (vertical.status === 'none') {
    body = (
      <div className="mx-auto max-w-xl p-6">
        <div className="rounded-lg border border-border bg-card p-6 text-sm text-muted-foreground">
          Tu laboratorio todavía no tiene una vertical asignada. Contacta a soporte para que la configure.
        </div>
      </div>
    )
  } else if (vertical.key === 'suelo') {
    body = <SoilDashboard showShortcuts />
  } else {
    body = <PestDashboard />
  }

  return <DashboardLayout>{body}</DashboardLayout>
}
