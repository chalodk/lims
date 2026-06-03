/**
 * Script para resetear la contrasena de un usuario en Supabase Auth.
 *
 * Uso:
 *   node scripts/reset-password.mjs --email gonzaloriso@gmail.com --password pr0visor1@
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  let content
  try {
    content = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('Error: no se encontro .env.local en la raiz del proyecto.')
    process.exit(1)
  }

  for (const line of content.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const eqIdx = trimmed.indexOf('=')
    if (eqIdx === -1) continue
    const key = trimmed.slice(0, eqIdx).trim()
    const val = trimmed.slice(eqIdx + 1).trim()
    if (!process.env[key]) {
      process.env[key] = val
    }
  }
}

function parseArgs() {
  const args = process.argv.slice(2)
  const opts = {}
  for (let i = 0; i < args.length; i++) {
    if (args[i].startsWith('--')) {
      const key = args[i].slice(2)
      const val = args[i + 1] && !args[i + 1].startsWith('--') ? args[++i] : true
      opts[key] = val
    }
  }
  return opts
}

async function main() {
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: faltan variables de entorno.')
    process.exit(1)
  }

  const opts = parseArgs()
  const email = opts.email
  const password = opts.password

  if (!email || !password) {
    console.error('Uso: node scripts/reset-password.mjs --email <email> --password <password>')
    process.exit(1)
  }

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // Buscar el usuario por email
  const { data: users, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error('Error al listar usuarios:', listError.message)
    process.exit(1)
  }

  const targetUser = users.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
  if (!targetUser) {
    console.error(`Error: no se encontro usuario con email ${email}`)
    process.exit(1)
  }

  console.log(`Usuario encontrado:`)
  console.log(`  ID:    ${targetUser.id}`)
  console.log(`  Email: ${targetUser.email}`)

  const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
    targetUser.id,
    { password }
  )

  if (updateError) {
    console.error('Error al cambiar contrasena:', updateError.message)
    process.exit(1)
  }

  console.log(`Contrasena actualizada exitosamente a: ${password}`)
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
