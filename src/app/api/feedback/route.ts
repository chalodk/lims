import { withAuth } from '@/lib/auth/api-auth'
import { NextResponse } from 'next/server'

const N8N_WEBHOOK_URL = process.env.N8N_FEEDBACK_WEBHOOK_URL

export const POST = withAuth(async (request, { user }) => {
  try {
    const body = await request.json()
    const { name, email, requirement, analysisType, message, companyName } = body

    if (!name || !email || !message) {
      return NextResponse.json(
        { error: 'Nombre, correo y mensaje son requeridos' },
        { status: 400 }
      )
    }

    const payload = {
      name,
      email,
      requirement,
      analysisType: analysisType || null,
      message,
      companyName: companyName || null,
      userId: user.id,
      submittedAt: new Date().toISOString(),
    }

    if (N8N_WEBHOOK_URL) {
      try {
        const webhookResponse = await fetch(N8N_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        })

        if (!webhookResponse.ok) {
          console.error('n8n webhook error:', webhookResponse.status)
        }
      } catch (webhookError) {
        console.error('n8n webhook call failed:', webhookError)
      }
    }

    return NextResponse.json({
      message: 'Feedback recibido exitosamente',
    })
  } catch (error) {
    console.error('Error en POST /api/feedback:', error)
    return NextResponse.json(
      { error: 'Error interno del servidor' },
      { status: 500 }
    )
  }
})
