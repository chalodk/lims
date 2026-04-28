import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { createUserAtomically } from '@/lib/services/userCreationService'

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * GET /api/settings/orphan-client-emails
 * Correos únicos de contacto de clientes de la compañía que aún no existen como
 * correo de ningún usuario en `users` (candidatos a crear cuenta).
 */
export async function GET() {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, company_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    type RoleData = { id: number; name: string } | { id: number; name: string }[]
    const roleData = currentUser.roles as RoleData
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const companyId = currentUser.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin compañía asignada' }, { status: 400 })
    }

    const { data: clientRows, error: clientsError } = await supabase
      .from('clients')
      .select('contact_email')
      .eq('company_id', companyId)
      .not('contact_email', 'is', null)

    if (clientsError) {
      console.error('[orphan-client-emails] clients:', clientsError)
      return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 })
    }

    /** Clave normalizada → texto mostrado (primera aparición conserva capitalización) */
    const contactEmailByNormalizedKey = new Map<string, string>()
    for (const row of clientRows || []) {
      const raw = row.contact_email ? String(row.contact_email).trim() : ''
      if (!raw) continue
      const key = normalizeEmail(raw)
      if (!contactEmailByNormalizedKey.has(key)) {
        contactEmailByNormalizedKey.set(key, raw)
      }
    }

    const { data: userRows, error: usersError } = await supabase
      .from('users')
      .select('email')
      .not('email', 'is', null)

    if (usersError) {
      console.error('[orphan-client-emails] users:', usersError)
      return NextResponse.json({ error: 'Error al cargar correos de usuarios' }, { status: 500 })
    }

    const existingEmailKeys = new Set<string>()
    for (const row of userRows || []) {
      const raw = row.email ? String(row.email).trim() : ''
      if (raw) existingEmailKeys.add(normalizeEmail(raw))
    }

    const potentialEmails = [...contactEmailByNormalizedKey.entries()]
      .filter(([normalizedKey]) => !existingEmailKeys.has(normalizedKey))
      .map(([, displayEmail]) => displayEmail)
      .sort((emailA, emailB) =>
        normalizeEmail(emailA).localeCompare(normalizeEmail(emailB), 'es')
      )

    return NextResponse.json({ potentialEmails })
  } catch (err) {
    console.error('[orphan-client-emails]', err)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}

type OrphanCreationStatus = 'created' | 'skipped' | 'error'

interface OrphanCreationResult {
  email: string
  status: OrphanCreationStatus
  reason?: string
  errorCode?: string
  clientId?: string
  userId?: string
  webhookSent?: boolean
  webhookError?: string
}

/**
 * POST /api/settings/orphan-client-emails
 * Crea en serie los usuarios consumidores faltantes a partir de los `contact_email`
 * de clientes huérfanos. Reutiliza `createUserAtomically` con `webhookOrigen: 1`
 * para disparar el webhook de credenciales con el mismo origen que la creación
 * automática desde POST /api/clients.
 *
 * Body opcional: { emails?: string[] }
 *  - Si se envía, sólo se procesan los emails que también figuran en la lista
 *    huérfana actual (whitelisting server-side).
 *  - Si no se envía, se procesan todos los huérfanos de la compañía.
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, company_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    type RoleData = { id: number; name: string } | { id: number; name: string }[]
    const roleData = currentUser.roles as RoleData
    const roleName = Array.isArray(roleData) ? roleData[0]?.name : roleData?.name

    if (roleName !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    const companyId = currentUser.company_id
    if (!companyId) {
      return NextResponse.json({ error: 'Usuario sin compañía asignada' }, { status: 400 })
    }

    let requestedEmailKeys: Set<string> | null = null
    try {
      const body = await request.json()
      if (Array.isArray(body?.emails)) {
        const keys = body.emails
          .filter((entry: unknown): entry is string => typeof entry === 'string')
          .map((entry: string) => normalizeEmail(entry))
          .filter((entry: string) => entry.length > 0)
        requestedEmailKeys = new Set<string>(keys)
      }
    } catch {
      // Body vacío o inválido: procesar todos los huérfanos
    }

    const { data: clientRows, error: clientsError } = await supabase
      .from('clients')
      .select('id, name, rut, contact_email')
      .eq('company_id', companyId)
      .not('contact_email', 'is', null)

    if (clientsError) {
      console.error('[orphan-client-emails:POST] clients:', clientsError)
      return NextResponse.json({ error: 'Error al cargar clientes' }, { status: 500 })
    }

    const contactEmailByNormalizedKey = new Map<string, string>()
    const clientsByEmailKey = new Map<string, Array<{ id: string; name: string; rut: string | null }>>()
    for (const row of clientRows || []) {
      const raw = row.contact_email ? String(row.contact_email).trim() : ''
      if (!raw) continue
      const key = normalizeEmail(raw)
      if (!contactEmailByNormalizedKey.has(key)) {
        contactEmailByNormalizedKey.set(key, raw)
      }
      const list = clientsByEmailKey.get(key) ?? []
      list.push({ id: row.id, name: row.name, rut: row.rut })
      clientsByEmailKey.set(key, list)
    }

    const { data: userRows, error: usersError } = await supabase
      .from('users')
      .select('email')
      .not('email', 'is', null)

    if (usersError) {
      console.error('[orphan-client-emails:POST] users:', usersError)
      return NextResponse.json({ error: 'Error al cargar correos de usuarios' }, { status: 500 })
    }

    const existingEmailKeys = new Set<string>()
    for (const row of userRows || []) {
      const raw = row.email ? String(row.email).trim() : ''
      if (raw) existingEmailKeys.add(normalizeEmail(raw))
    }

    const orphanKeys = [...clientsByEmailKey.keys()].filter(key => !existingEmailKeys.has(key))
    const targetKeys = requestedEmailKeys
      ? orphanKeys.filter(key => requestedEmailKeys!.has(key))
      : orphanKeys

    const results: OrphanCreationResult[] = []

    for (const emailKey of targetKeys) {
      const displayEmail = contactEmailByNormalizedKey.get(emailKey) ?? emailKey
      const matchingClients = clientsByEmailKey.get(emailKey) ?? []

      if (matchingClients.length === 0) {
        results.push({
          email: displayEmail,
          status: 'error',
          reason: 'No se encontró cliente asociado a este correo',
        })
        continue
      }

      if (matchingClients.length > 1) {
        results.push({
          email: displayEmail,
          status: 'skipped',
          reason: `El correo está asignado a ${matchingClients.length} clientes; saltado para evitar ambigüedad`,
        })
        continue
      }

      const targetClient = matchingClients[0]

      if (!targetClient.rut || !targetClient.rut.trim()) {
        results.push({
          email: displayEmail,
          status: 'error',
          reason: 'El cliente no tiene RUT registrado; no se puede generar contraseña',
          errorCode: 'INVALID_RUT',
          clientId: targetClient.id,
        })
        continue
      }

      const createResult = await createUserAtomically({
        email: displayEmail,
        name: targetClient.name,
        rut: targetClient.rut,
        companyId,
        clientId: targetClient.id,
        roleName: 'consumidor',
        webhookOrigen: 1,
      })

      if (createResult.success) {
        results.push({
          email: displayEmail,
          status: 'created',
          clientId: targetClient.id,
          userId: createResult.userId,
          webhookSent: createResult.webhookSent,
          webhookError: createResult.webhookError,
        })
      } else {
        results.push({
          email: displayEmail,
          status: 'error',
          reason: createResult.error,
          errorCode: createResult.errorCode,
          clientId: targetClient.id,
        })
      }
    }

    const summary = {
      requested: targetKeys.length,
      created: results.filter(r => r.status === 'created').length,
      skipped: results.filter(r => r.status === 'skipped').length,
      errors: results.filter(r => r.status === 'error').length,
    }

    return NextResponse.json({ summary, results })
  } catch (err) {
    console.error('[orphan-client-emails:POST]', err)
    return NextResponse.json({ error: 'Error inesperado' }, { status: 500 })
  }
}
