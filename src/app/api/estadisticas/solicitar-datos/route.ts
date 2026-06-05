import { NextResponse } from 'next/server'
import { withAuth } from '@/lib/auth/api-auth'

function buildBasicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64')
  return `Basic ${encoded}`
}

export const POST = withAuth(async (_request, { user, supabase }) => {
  const webhookUrl = process.env.REPORT_WEBHOOK_URL?.trim()
  const webhookUser = process.env.USER_CREDENTIALS_WEBHOOK_USER?.trim()
  const webhookPassword = process.env.USER_CREDENTIALS_WEBHOOK_PASSWORD?.trim()

  if (!webhookUrl) {
    return NextResponse.json(
      { error: 'REPORT_WEBHOOK_URL no configurada' },
      { status: 500 }
    )
  }

  const { data: userData } = await supabase
    .from('users')
    .select('company_id')
    .eq('id', user.id)
    .single()

  const companyId = userData?.company_id ?? null

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (webhookUser && webhookPassword) {
    headers['Authorization'] = buildBasicAuthHeader(webhookUser, webhookPassword)
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({ company_id: companyId, email: user.email }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(`[solicitar-datos] Webhook responded with ${response.status}:`, errorText)
      return NextResponse.json(
        { error: `El servicio respondió con código ${response.status}` },
        { status: response.status }
      )
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[solicitar-datos] Error contacting webhook:', errorMessage)
    return NextResponse.json(
      { error: 'No se pudo conectar con el servicio de reportes' },
      { status: 500 }
    )
  }
})
