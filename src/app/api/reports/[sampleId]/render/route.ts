import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { ReportService } from '@/lib/reports/reportService'

async function verifySampleOwnership(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sampleId: string,
  userId: string
) {
  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', userId)
    .single()

  const companyId = userData?.company_id
  if (!companyId) {
    return { authorized: false, error: 'Usuario sin empresa asignada', status: 400 }
  }

  const { data: sample } = await supabase
    .from('samples')
    .select('company_id')
    .eq('id', sampleId)
    .single()

  if (!sample || sample.company_id !== companyId) {
    return { authorized: false, error: 'Muestra no encontrada', status: 404 }
  }

  return { authorized: true, companyId }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { authorized, error, status } = await verifySampleOwnership(supabase, resolvedParams.sampleId, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const body = await request.json()
    const { template_code, version } = body

    if (!template_code) {
      return NextResponse.json(
        { error: 'template_code es requerido' },
        { status: 400 }
      )
    }

    const reportService = new ReportService()

    const sample = await reportService.getSampleData(resolvedParams.sampleId)
    if (!sample) {
      return NextResponse.json({ error: 'Muestra no encontrada' }, { status: 404 })
    }

    const report = await reportService.renderReport(
      resolvedParams.sampleId,
      template_code,
      version,
      user.id
    )

    return NextResponse.json(report)
  } catch (error) {
    console.error('Error rendering report:', error)
    return NextResponse.json(
      { error: 'Error al generar el reporte' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ sampleId: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    const { authorized, error, status } = await verifySampleOwnership(supabase, resolvedParams.sampleId, user.id)
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    const reportService = new ReportService()
    const reports = await reportService.getReportsForSample(resolvedParams.sampleId)

    return NextResponse.json(reports)
  } catch (error) {
    console.error('Error fetching reports:', error)
    return NextResponse.json(
      { error: 'Error al obtener los reportes' },
      { status: 500 }
    )
  }
}
