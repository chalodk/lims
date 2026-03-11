/**
 * Envía las credenciales del nuevo usuario a un webhook configurado.
 * No falla la creación del usuario si el webhook falla o no está configurado.
 *
 * Origen:
 * 1 = Usuario creado a partir de la creación de un cliente (email + contraseña = RUT sin puntos/guión/DV)
 * 2 = Usuario creado desde Configuración por un admin (consumidor u otro rol)
 *
 * Variables de entorno:
 * - USER_CREDENTIALS_WEBHOOK_URL
 * - USER_CREDENTIALS_WEBHOOK_USER (Basic Auth)
 * - USER_CREDENTIALS_WEBHOOK_PASSWORD (Basic Auth)
 * - USER_CREDENTIALS_WEBHOOK_DISABLE_AUTH=true (opcional) para no enviar Authorization y diagnosticar 403
 */

export type UserCredentialsOrigen = 1 | 2

export interface UserCredentialsWebhookPayload {
  email: string
  password: string
  origen: UserCredentialsOrigen
}

function buildBasicAuthHeader(username: string, password: string): string {
  const encoded = Buffer.from(`${username}:${password}`, 'utf-8').toString('base64')
  return `Basic ${encoded}`
}

export async function sendUserCredentialsToWebhook(
  payload: UserCredentialsWebhookPayload
): Promise<{ sent: boolean; error?: string }> {
  const webhookUrl = process.env.USER_CREDENTIALS_WEBHOOK_URL?.trim()
  const webhookUser = process.env.USER_CREDENTIALS_WEBHOOK_USER?.trim()
  const webhookPassword = process.env.USER_CREDENTIALS_WEBHOOK_PASSWORD?.trim()
  const disableAuth = process.env.USER_CREDENTIALS_WEBHOOK_DISABLE_AUTH === 'true'

  if (!webhookUrl) {
    return { sent: false }
  }

  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  }
  if (!disableAuth && webhookUser && webhookPassword) {
    headers['Authorization'] = buildBasicAuthHeader(webhookUser, webhookPassword)
  }

  try {
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        email: payload.email,
        password: payload.password,
        origen: payload.origen,
      }),
    })

    if (!response.ok) {
      const errorText = await response.text()
      console.error(
        `[userCredentialsWebhook] Webhook responded with ${response.status}:`,
        errorText
      )
      return {
        sent: false,
        error: `Webhook responded with ${response.status}`,
      }
    }

    return { sent: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error)
    console.error('[userCredentialsWebhook] Error sending credentials:', errorMessage)
    return {
      sent: false,
      error: errorMessage,
    }
  }
}
