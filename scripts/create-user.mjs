/**
 * Script CLI para crear el primer usuario (admin) en un proyecto Supabase nuevo.
 *
 * Uso:
 *   node scripts/create-user.mjs \
 *     --email admin@lims.com \
 *     --name Administrador \
 *     --rut 11111111-1 \
 *     --company "Laboratorio de Prueba" \
 *     --role admin
 *
 * Requiere las variables NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY en .env.local.
 * Si la empresa no existe, la crea automaticamente.
 * El usuario se crea en auth.users + public.users en un solo paso atomico.
 */

import { readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { createClient } from '@supabase/supabase-js'

const __dirname = dirname(fileURLToPath(import.meta.url))

// ---------------------------------------------------------------------------
// Cargar .env.local manualmente
// ---------------------------------------------------------------------------
function loadEnv() {
  const envPath = resolve(__dirname, '..', '.env.local')
  let content
  try {
    content = readFileSync(envPath, 'utf-8')
  } catch {
    console.error('Error: no se encontro .env.local en la raiz del proyecto.')
    console.error('Copialo desde .env.example y configura las credenciales de Supabase.')
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

// ---------------------------------------------------------------------------
// Parsear argumentos CLI
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// Validaciones basicas
// ---------------------------------------------------------------------------
function validateEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
}

function generatePassword(length = 12) {
  const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'
  const lower = 'abcdefghijklmnopqrstuvwxyz'
  const digits = '0123456789'
  const special = '!@#$%^&*'
  const all = upper + lower + digits + special

  let pwd = ''
  pwd += upper[Math.floor(Math.random() * upper.length)]
  pwd += lower[Math.floor(Math.random() * lower.length)]
  pwd += digits[Math.floor(Math.random() * digits.length)]
  pwd += special[Math.floor(Math.random() * special.length)]
  for (let i = pwd.length; i < length; i++) {
    pwd += all[Math.floor(Math.random() * all.length)]
  }
  return pwd.split('').sort(() => Math.random() - 0.5).join('')
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main() {
  loadEnv()

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('Error: faltan variables de entorno.')
    console.error('Asegurate de que .env.local contenga:')
    console.error('  NEXT_PUBLIC_SUPABASE_URL=https://<proyecto>.supabase.co')
    console.error('  SUPABASE_SERVICE_ROLE_KEY=<service_role_key>')
    process.exit(1)
  }

  const opts = parseArgs()
  const email = opts.email
  const name = opts.name
  const rut = opts.rut
  const companyName = opts.company
  const roleName = opts.role || 'admin'

  // Validar parametros requeridos
  if (!email || !name || !rut || !companyName) {
    console.error('Uso: node scripts/create-user.mjs \\')
    console.error('  --email <email> \\')
    console.error('  --name <nombre> \\')
    console.error('  --rut <rut> \\')
    console.error('  --company <nombre empresa> \\')
    console.error('  [--role <rol>]   (default: admin)')
    process.exit(1)
  }

  if (!validateEmail(email)) {
    console.error(`Error: email invalido: ${email}`)
    process.exit(1)
  }

  console.log(`Creando usuario...`)
  console.log(`  Email:    ${email}`)
  console.log(`  Nombre:   ${name}`)
  console.log(`  RUT:      ${rut}`)
  console.log(`  Empresa:  ${companyName}`)
  console.log(`  Rol:      ${roleName}`)
  console.log('')

  const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  })

  // 1. Verificar si el email ya existe
  const { data: existingList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
  if (listError) {
    console.error('Error al consultar usuarios existentes:', listError.message)
    process.exit(1)
  }
  const emailLower = email.trim().toLowerCase()
  const existingAuthUser = existingList?.users?.find(u => u.email?.toLowerCase() === emailLower)
  if (existingAuthUser) {
    console.log(`El email ${email} ya existe en auth.users (id: ${existingAuthUser.id}).`)

    // Verificar si tiene perfil en public.users
    const { data: existingProfile } = await supabaseAdmin
      .from('users')
      .select('id, name, company_id')
      .eq('id', existingAuthUser.id)
      .single()

    if (existingProfile) {
      console.log(`Ya tiene perfil en public.users (name: ${existingProfile.name}).`)
      console.log('No se requiere ninguna accion.')
      process.exit(0)
    }

    console.log('No tiene perfil en public.users. Creando perfil...')
    // ... continua abajo
  }

  // 2. Obtener o crear empresa
  let companyId
  const { data: existingCompany } = await supabaseAdmin
    .from('companies')
    .select('id')
    .eq('name', companyName)
    .single()

  if (existingCompany) {
    companyId = existingCompany.id
    console.log(`Empresa encontrada: ${companyName} (${companyId})`)
  } else {
    const { data: newCompany, error: companyError } = await supabaseAdmin
      .from('companies')
      .insert({ name: companyName })
      .select('id')
      .single()

    if (companyError) {
      console.error('Error al crear empresa:', companyError.message)
      process.exit(1)
    }
    companyId = newCompany.id
    console.log(`Empresa creada: ${companyName} (${companyId})`)
  }

  // 3. Obtener role_id
  const { data: role, error: roleError } = await supabaseAdmin
    .from('roles')
    .select('id, name')
    .eq('name', roleName)
    .single()

  if (roleError || !role) {
    console.error(`Error: rol '${roleName}' no encontrado en la tabla roles.`)
    console.error('Ejecuta primero backup/er_schema_complete.sql para crear los roles.')
    process.exit(1)
  }

  // 4. Crear usuario con perfil
  const password = generatePassword()
  let authUserId

  if (!existingAuthUser) {
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password,
      email_confirm: true,
      user_metadata: { name: name.trim(), company_id: companyId },
    })

    if (createAuthError || !authUser.user) {
      console.error('Error al crear usuario en auth:', createAuthError?.message)
      process.exit(1)
    }
    authUserId = authUser.user.id
    console.log(`Usuario creado en auth.users: ${authUserId}`)
  } else {
    authUserId = existingAuthUser.id
    console.log(`Usando auth user existente: ${authUserId}`)
  }

  // 5. Crear perfil en public.users
  const { error: profileError } = await supabaseAdmin
    .from('users')
    .insert({
      id: authUserId,
      name: name.trim(),
      email: email.trim().toLowerCase(),
      role_id: role.id,
      company_id: companyId,
      created_at: new Date().toISOString(),
    })
    .select()
    .single()

  if (profileError) {
    console.error('Error al crear perfil en public.users:', profileError.message)

    // Rollback: eliminar auth user si lo acabamos de crear
    if (!existingAuthUser) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log('Rollback: usuario eliminado de auth.users')
      } catch (e) {
        console.error('Error en rollback:', e.message)
      }
    }
    process.exit(1)
  }

  console.log(`Perfil creado en public.users.`)
  console.log('')
  console.log('=== USUARIO CREADO EXITOSAMENTE ===')
  console.log(`  Email:    ${email}`)
  console.log(`  Password: ${password}`)
  console.log(`  Rol:      ${role.name}`)
  console.log(`  Empresa:  ${companyName}`)
  console.log('')
  console.log('Guarda la contrasena. Inicia sesion en http://localhost:3000')
}

main().catch((err) => {
  console.error('Error inesperado:', err)
  process.exit(1)
})
