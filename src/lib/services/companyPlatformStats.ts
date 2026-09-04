import type { SupabaseClient } from '@supabase/supabase-js'
import {
  PLATFORM_STATS_MONTHS,
  mergeTypeCounts,
  rollingCalendarMonths,
  type CompanyPlatformStats,
  type StatusCount,
} from '@/lib/stats/platformUsage'

type RpcMonthBucket = {
  month_start?: string
  count?: number
}

type RpcTypeCount = {
  type_key?: string
  count?: number
}

type CsxUsageRpcPayload = {
  company_id: string
  company_name: string
  clients_total: number
  samples: {
    total: number
    this_month: number
    last_month: number
    received: number
    processing: number
    validation: number
    completed: number
    by_month: RpcMonthBucket[]
    by_type?: RpcTypeCount[]
  }
  reports: {
    total: number
    this_month: number
    last_month: number
    completed_total: number
    completed_this_month: number
    draft: number
    generated: number
    sent: number
    validated: number
    by_month: RpcMonthBucket[]
    by_type?: RpcTypeCount[]
  }
}

const MISSING_RPC_MESSAGE =
  'Falta aplicar migrations/021_csx_read_usage_tables.sql (y 023_csx_usage_by_type.sql si 021 ya estaba aplicada) en Supabase (función csx_company_usage_stats).'

function isMissingRpcError(error: { code?: string; message?: string }): boolean {
  const message = error.message || ''
  return (
    error.code === 'PGRST202' ||
    error.code === '42883' ||
    message.includes('csx_company_usage_stats') ||
    message.toLowerCase().includes('could not find the function')
  )
}

function monthCounts(buckets: RpcMonthBucket[] | undefined, expectedLength: number): number[] {
  const counts = (buckets || []).map((bucket) => Number(bucket.count) || 0)
  if (counts.length === expectedLength) return counts
  return Array.from({ length: expectedLength }, (_, index) => counts[index] ?? 0)
}

export function assembleCompanyPlatformStats(
  payload: CsxUsageRpcPayload,
  referenceDate: Date = new Date()
): CompanyPlatformStats {
  const months = rollingCalendarMonths(PLATFORM_STATS_MONTHS, referenceDate)
  const thisMonth = months[months.length - 1]
  const lastMonth = months[months.length - 2]
  if (!thisMonth || !lastMonth) {
    throw new Error('No se pudo calcular el periodo mensual')
  }

  const sampleMonthCounts = monthCounts(payload.samples.by_month, months.length)
  const reportMonthCounts = monthCounts(payload.reports.by_month, months.length)

  const samplesByStatus: StatusCount[] = [
    { key: 'received', label: 'Recibidas', count: payload.samples.received },
    { key: 'processing', label: 'En proceso', count: payload.samples.processing },
    { key: 'validation', label: 'En validación', count: payload.samples.validation },
    { key: 'completed', label: 'Completadas', count: payload.samples.completed },
  ]

  return {
    companyId: payload.company_id,
    companyName: payload.company_name,
    period: { thisMonth, lastMonth },
    clients: { total: payload.clients_total },
    samples: {
      total: payload.samples.total,
      thisMonth: payload.samples.this_month,
      lastMonth: payload.samples.last_month,
      active: payload.samples.received + payload.samples.processing + payload.samples.validation,
      byStatus: samplesByStatus,
      byMonth: months.map((month, index) => ({ ...month, count: sampleMonthCounts[index] ?? 0 })),
      byType: mergeTypeCounts(payload.samples.by_type),
    },
    reports: {
      total: payload.reports.total,
      thisMonth: payload.reports.this_month,
      lastMonth: payload.reports.last_month,
      completedTotal: payload.reports.completed_total,
      completedThisMonth: payload.reports.completed_this_month,
      byStatus: [
        { key: 'draft', label: 'Borrador', count: payload.reports.draft },
        { key: 'generated', label: 'Generados', count: payload.reports.generated },
        { key: 'sent', label: 'Enviados', count: payload.reports.sent },
        { key: 'validated', label: 'Validados', count: payload.reports.validated },
      ],
      byMonth: months.map((month, index) => ({ ...month, count: reportMonthCounts[index] ?? 0 })),
      byType: mergeTypeCounts(payload.reports.by_type),
    },
  }
}

export async function getCompanyPlatformStats(
  supabase: SupabaseClient,
  companyId: string,
  referenceDate: Date = new Date()
): Promise<CompanyPlatformStats> {
  const months = rollingCalendarMonths(PLATFORM_STATS_MONTHS, referenceDate)
  const thisMonth = months[months.length - 1]
  if (!thisMonth) {
    throw new Error('No se pudo calcular el periodo mensual')
  }

  const { data, error } = await supabase.rpc('csx_company_usage_stats', {
    p_company_id: companyId,
    p_this_start: thisMonth.startIso,
    p_this_end: thisMonth.endIso,
    p_month_count: PLATFORM_STATS_MONTHS,
  })

  if (error) {
    if (isMissingRpcError(error)) {
      throw new Error(MISSING_RPC_MESSAGE)
    }
    if (error.message === 'Compañía no encontrada' || error.code === 'P0002') {
      throw new Error('Compañía no encontrada')
    }
    throw new Error(error.message)
  }

  if (!data) {
    throw new Error('Respuesta vacía de estadísticas')
  }

  return assembleCompanyPlatformStats(data as CsxUsageRpcPayload, referenceDate)
}
