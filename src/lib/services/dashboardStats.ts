import type { SupabaseClient } from '@supabase/supabase-js'

export const PROCESSING_SAMPLE_STATUSES = [
  'processing',
  'microscopy',
  'isolation',
  'identification',
  'molecular_analysis',
] as const

export type DashboardStats = {
  samples: {
    total: number
    received: number
    processing: number
    validation: number
    completed: number
  }
  results: {
    total: number
    pending: number
    completed: number
    validated: number
  }
  reports: {
    total: number
    draft: number
    generated: number
    sent: number
  }
  overview: {
    activeSamples: number
    pendingWork: number
    completedWork: number
    completedToday: number
    totalReports: number
    totalClients: number
  }
}

type CountResult = {
  count: number | null
  error: { message: string } | null
}

type CountableQuery = PromiseLike<CountResult>

const COUNT_SELECT = { count: 'exact' as const, head: true }

async function exactCount(query: CountableQuery, label: string): Promise<number> {
  const { count, error } = await query
  if (error) {
    throw new Error(`Error contando ${label}: ${error.message}`)
  }
  return count ?? 0
}

function countByCompany(
  supabase: SupabaseClient,
  table: 'samples' | 'reports' | 'clients',
  companyId: string | null | undefined
) {
  const query = supabase.from(table).select('id', COUNT_SELECT)
  return companyId ? query.eq('company_id', companyId) : query
}

function countResults(
  supabase: SupabaseClient,
  companyId: string | null | undefined
) {
  if (companyId) {
    return supabase
      .from('results')
      .select('id, samples!inner(company_id)', COUNT_SELECT)
      .eq('samples.company_id', companyId)
  }
  return supabase.from('results').select('id', COUNT_SELECT)
}

export function assembleDashboardStats(input: {
  samples: DashboardStats['samples']
  results: DashboardStats['results']
  reports: DashboardStats['reports']
  totalClients: number
  completedToday: number
}): DashboardStats {
  const activeSamples = input.samples.received + input.samples.processing + input.samples.validation
  const pendingWork = input.results.pending + input.samples.processing + input.samples.validation
  const completedWork = input.results.completed + input.results.validated

  return {
    samples: input.samples,
    results: input.results,
    reports: input.reports,
    overview: {
      activeSamples,
      pendingWork,
      completedWork,
      completedToday: input.completedToday,
      totalReports: input.reports.total,
      totalClients: input.totalClients,
    },
  }
}

export async function getDashboardStats(
  supabase: SupabaseClient,
  options: {
    companyId?: string | null
    completedRangeStart: Date
    completedRangeEnd: Date
  }
): Promise<DashboardStats> {
  const companyId = options.companyId
  const completedRangeStartIso = options.completedRangeStart.toISOString()
  const completedRangeEndIso = options.completedRangeEnd.toISOString()

  const [
    samplesTotal,
    samplesReceived,
    samplesProcessing,
    samplesValidation,
    samplesCompleted,
    resultsTotal,
    resultsPending,
    resultsCompleted,
    resultsValidated,
    reportsTotal,
    reportsDraft,
    reportsGenerated,
    reportsSent,
    totalClients,
    validatedToday,
    completedOnlyToday,
  ] = await Promise.all([
    exactCount(countByCompany(supabase, 'samples', companyId), 'muestras'),
    exactCount(countByCompany(supabase, 'samples', companyId).eq('status', 'received'), 'muestras recibidas'),
    exactCount(
      countByCompany(supabase, 'samples', companyId).in('status', [...PROCESSING_SAMPLE_STATUSES]),
      'muestras en proceso'
    ),
    exactCount(countByCompany(supabase, 'samples', companyId).eq('status', 'validation'), 'muestras en validación'),
    exactCount(countByCompany(supabase, 'samples', companyId).eq('status', 'completed'), 'muestras completadas'),
    exactCount(countResults(supabase, companyId), 'resultados'),
    exactCount(countResults(supabase, companyId).eq('status', 'pending'), 'resultados pendientes'),
    exactCount(countResults(supabase, companyId).eq('status', 'completed'), 'resultados completados'),
    exactCount(countResults(supabase, companyId).eq('status', 'validated'), 'resultados validados'),
    exactCount(countByCompany(supabase, 'reports', companyId), 'informes'),
    exactCount(countByCompany(supabase, 'reports', companyId).eq('status', 'draft'), 'informes en borrador'),
    exactCount(countByCompany(supabase, 'reports', companyId).eq('status', 'generated'), 'informes generados'),
    exactCount(countByCompany(supabase, 'reports', companyId).eq('status', 'sent'), 'informes enviados'),
    exactCount(countByCompany(supabase, 'clients', companyId), 'clientes'),
    exactCount(
      countResults(supabase, companyId)
        .eq('status', 'validated')
        .gte('validation_date', completedRangeStartIso)
        .lte('validation_date', completedRangeEndIso),
      'resultados validados del día'
    ),
    exactCount(
      countResults(supabase, companyId)
        .eq('status', 'completed')
        .gte('updated_at', completedRangeStartIso)
        .lte('updated_at', completedRangeEndIso),
      'resultados completados del día'
    ),
  ])

  return assembleDashboardStats({
    samples: {
      total: samplesTotal,
      received: samplesReceived,
      processing: samplesProcessing,
      validation: samplesValidation,
      completed: samplesCompleted,
    },
    results: {
      total: resultsTotal,
      pending: resultsPending,
      completed: resultsCompleted,
      validated: resultsValidated,
    },
    reports: {
      total: reportsTotal,
      draft: reportsDraft,
      generated: reportsGenerated,
      sent: reportsSent,
    },
    totalClients,
    completedToday: validatedToday + completedOnlyToday,
  })
}
