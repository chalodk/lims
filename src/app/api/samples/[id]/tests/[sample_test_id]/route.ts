import { NextRequest, NextResponse } from 'next/server'
import { withAuth, type SupabaseServerClient } from '@/lib/auth/api-auth'

async function verifySampleOwnershipViaTest(
  supabase: SupabaseServerClient,
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

export const DELETE = withAuth(async (request, { user, supabase, params }) => {
  try {
    const { id, sample_test_id } = await (params as Promise<{ id: string; sample_test_id: string }>)

    const { authorized, error, status } = await verifySampleOwnershipViaTest(
      supabase,
      sample_test_id,
      user.id
    )
    if (!authorized) {
      return NextResponse.json({ error }, { status })
    }

    // Verify the sample test also belongs to the specified sample in URL
    const { data: sampleTest } = await supabase
      .from('sample_tests')
      .select('id')
      .eq('id', sample_test_id)
      .eq('sample_id', id)
      .single()

    if (!sampleTest) {
      return NextResponse.json({ error: 'Test no encontrado para esta muestra' }, { status: 404 })
    }

    const { error: deleteError } = await supabase
      .from('sample_tests')
      .delete()
      .eq('id', sample_test_id)

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
})
