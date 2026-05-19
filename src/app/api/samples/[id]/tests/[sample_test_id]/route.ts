import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

async function verifySampleOwnershipViaTest(
  supabase: Awaited<ReturnType<typeof createClient>>,
  sampleTestId: string,
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

  // Verify via: sample_test → samples.company_id
  const { data: sampleTest } = await supabase
    .from('sample_tests')
    .select('sample_id, samples!inner(company_id)')
    .eq('id', sampleTestId)
    .single()

  const sampleCompanyId = sampleTest && Array.isArray(sampleTest.samples) && sampleTest.samples.length > 0
    ? (sampleTest.samples[0] as Record<string, unknown>).company_id
    : null

  if (!sampleTest || sampleCompanyId !== companyId) {
    return { authorized: false, error: 'Test no encontrado', status: 404 }
  }

  return { authorized: true, companyId }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string; sample_test_id: string }> }
) {
  try {
    const resolvedParams = await params
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autorizado' }, { status: 401 })
    }

    // Verify sample ownership via parent chain
    const { authorized, error, status } = await verifySampleOwnershipViaTest(
      supabase,
      resolvedParams.sample_test_id,
      user.id
    )
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    // Verify the sample test also belongs to the specified sample in URL
    const { data: sampleTest } = await supabase
      .from('sample_tests')
      .select('id')
      .eq('id', resolvedParams.sample_test_id)
      .eq('sample_id', resolvedParams.id)
      .single()

    if (!sampleTest) {
      return NextResponse.json({ error: 'Test no encontrado para esta muestra' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('sample_tests')
      .delete()
      .eq('id', resolvedParams.sample_test_id)

    if (deleteError) {
      return NextResponse.json({ error: 'Error al eliminar el test' }, { status: 500 })
    }

    return NextResponse.json({ message: 'Test eliminado correctamente' })
  } catch (error) {
    console.error('Error deleting sample test:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
}
