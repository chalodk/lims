import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { withAuth } from '@/lib/auth/api-auth'
import { requireSoilLab } from '@/lib/services/soilService'

const createSoilSampleSchema = z.object({
  client_id: z.string().uuid(),
  code: z
    .string()
    .trim()
    .regex(/^\d+$/, 'El código de muestra debe ser numérico, igual que la columna A del Excel'),
  received_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  notes: z.string().trim().max(2000).optional(),
})

type SoilSampleListRow = {
  id: string
  code: string
  status: string
  received_at: string
  created_at: string
  clients: { name: string } | { name: string }[] | null
  soil_subsamples: { number: number; soil_results: { id: string }[] | null }[] | null
}

function firstOf<T>(value: T | T[] | null): T | null {
  return Array.isArray(value) ? (value[0] ?? null) : value
}

/** GET /api/soil/samples — muestras de suelo de la company, más recientes primero. */
export const GET = withAuth(async (_request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const { data, error } = await supabase
      .from('soil_samples')
      .select(
        'id, code, status, received_at, created_at, clients(name), soil_subsamples(number, soil_results(id))'
      )
      .eq('company_id', access.companyId)
      .order('received_at', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(500)
    if (error) throw new Error(error.message)

    const samples = ((data || []) as unknown as SoilSampleListRow[]).map((row) => {
      const subsamples = row.soil_subsamples || []
      const resultCount = subsamples.reduce(
        (total, subsample) => total + (subsample.soil_results || []).length,
        0
      )
      return {
        id: row.id,
        code: row.code,
        status: row.status,
        receivedAt: row.received_at,
        clientName: firstOf(row.clients)?.name ?? null,
        subsampleCount: subsamples.length,
        resultCount,
      }
    })

    return NextResponse.json({ samples })
  } catch (error) {
    console.error('Error en GET /api/soil/samples:', error)
    return NextResponse.json(
      {
        error: 'Error al obtener muestras de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})

/** POST /api/soil/samples — registra cliente, número, comentario y fecha de recepción. */
export const POST = withAuth(async (request: NextRequest, { user, supabase }) => {
  try {
    const access = await requireSoilLab(supabase, user.id)
    if (!access.ok) return NextResponse.json({ error: access.error }, { status: access.status })

    const parsedBody = createSoilSampleSchema.safeParse(await request.json().catch(() => null))
    if (!parsedBody.success) {
      return NextResponse.json(
        { error: parsedBody.error.issues[0]?.message ?? 'Datos inválidos' },
        { status: 400 }
      )
    }
    const sampleInput = parsedBody.data

    const { data: client } = await supabase
      .from('clients')
      .select('id')
      .eq('id', sampleInput.client_id)
      .eq('company_id', access.companyId)
      .maybeSingle()
    if (!client) {
      return NextResponse.json({ error: 'Cliente no encontrado en tu laboratorio' }, { status: 400 })
    }

    const { data: createdSample, error: sampleError } = await supabase
      .from('soil_samples')
      .insert({
        company_id: access.companyId,
        client_id: sampleInput.client_id,
        code: sampleInput.code,
        received_at: sampleInput.received_at,
        notes: sampleInput.notes || null,
        created_by: user.id,
      })
      .select('id, code')
      .single()

    if (sampleError || !createdSample) {
      if (sampleError?.code === '23505') {
        return NextResponse.json(
          { error: `Ya existe una muestra con el código ${sampleInput.code}` },
          { status: 409 }
        )
      }
      throw new Error(sampleError?.message || 'No se pudo crear la muestra')
    }

    return NextResponse.json({ sample: createdSample }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/soil/samples:', error)
    return NextResponse.json(
      {
        error: 'Error al registrar la muestra de suelo',
        details: error instanceof Error ? error.message : 'Error desconocido',
      },
      { status: 500 }
    )
  }
})
