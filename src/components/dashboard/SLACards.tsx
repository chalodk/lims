'use client'

import { useState, useEffect, useCallback } from 'react'
import { createClient } from '@/lib/supabase/client'
import { 
  Clock, 
  AlertTriangle, 
  XCircle, 
  TrendingUp 
} from 'lucide-react'

interface SLAStats {
  express_samples: number
  at_risk: number
  breached: number
  total_active: number
}

export function SLACards() {
  const [stats, setStats] = useState<SLAStats>({
    express_samples: 0,
    at_risk: 0,
    breached: 0,
    total_active: 0
  })
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const supabase = createClient()

  const fetchSLAStats = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('samples')
        .select('sla_type, sla_status, status')
        .in('status', ['received', 'processing', 'microscopy', 'isolation', 'identification', 'molecular_analysis', 'validation'])

      if (error) throw error

      const stats: SLAStats = {
        express_samples: 0,
        at_risk: 0,
        breached: 0,
        total_active: data?.length || 0
      }

      data?.forEach(sample => {
        if (sample.sla_type === 'express') {
          stats.express_samples++
        }
        if (sample.sla_status === 'at_risk') {
          stats.at_risk++
        }
        if (sample.sla_status === 'breached') {
          stats.breached++
        }
      })

      setStats(stats)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error loading SLA stats')
    } finally {
      setLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    fetchSLAStats()
    
    // Set up real-time subscription for sample updates
    const subscription = supabase
      .channel('sla-updates')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'samples'
        },
        () => {
          fetchSLAStats()
        }
      )
      .subscribe()

    return () => {
      subscription.unsubscribe()
    }
  }, [fetchSLAStats, supabase])

  if (loading) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {[...Array(4)].map((_, i) => (
          <div key={i} className="bg-white p-6 rounded-lg shadow animate-pulse">
            <div className="h-4 bg-gray-200 rounded w-3/4 mb-2"></div>
            <div className="h-8 bg-gray-200 rounded w-1/2"></div>
          </div>
        ))}
      </div>
    )
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-red-700">Error: {error}</p>
      </div>
    )
  }

  const cards = [
    {
      title: 'Urgentes (Express)',
      value: stats.express_samples,
      icon: Clock,
      color: 'blue',
      description: 'Muestras con SLA express'
    },
    {
      title: 'En Riesgo SLA',
      value: stats.at_risk,
      icon: AlertTriangle,
      color: 'yellow',
      description: 'Próximas a vencer'
    },
    {
      title: 'SLA Vencidas',
      value: stats.breached,
      icon: XCircle,
      color: 'red',
      description: 'Muestras vencidas'
    },
    {
      title: 'Total Activas',
      value: stats.total_active,
      icon: TrendingUp,
      color: 'green',
      description: 'Muestras en proceso'
    }
  ]

  const getColorClasses = (color: string) => {
    switch (color) {
      case 'blue':
        return {
          bg: 'bg-blue-50',
          icon: 'text-blue-600',
          text: 'text-blue-900'
        }
      case 'yellow':
        return {
          bg: 'bg-yellow-50',
          icon: 'text-yellow-600',
          text: 'text-yellow-900'
        }
      case 'red':
        return {
          bg: 'bg-red-50',
          icon: 'text-red-600',
          text: 'text-red-900'
        }
      case 'green':
        return {
          bg: 'bg-green-50',
          icon: 'text-green-600',
          text: 'text-green-900'
        }
      default:
        return {
          bg: 'bg-gray-50',
          icon: 'text-gray-600',
          text: 'text-gray-900'
        }
    }
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
      {cards.map((card, index) => {
        const colors = getColorClasses(card.color)
        const Icon = card.icon
        
        return (
          <div
            key={index}
            className={`${colors.bg} p-6 rounded-lg shadow hover:shadow-md transition-shadow cursor-pointer`}
          >
            <div className="flex items-center justify-between">
              <div>
                <p className={`text-sm font-medium ${colors.text} opacity-75`}>
                  {card.title}
                </p>
                <p className={`text-3xl font-bold ${colors.text} mt-2`}>
                  {card.value}
                </p>
                <p className={`text-xs ${colors.text} opacity-60 mt-1`}>
                  {card.description}
                </p>
              </div>
              <div className={`${colors.icon}`}>
                <Icon className="h-8 w-8" />
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}