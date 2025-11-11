import { createClient as createAdminClient } from '@supabase/supabase-js'
import { createClient } from '@/lib/supabase/server'

/**
 * Tipos para el servicio de creación de usuarios
 */
export interface CreateUserOptions {
  email: string
  name: string
  rut: string
  companyId: string
  clientId: string
  roleName?: string // Default: 'consumidor'
}

export interface CreateUserResult {
  success: boolean
  userId?: string
  warning?: string
  error?: string
  errorCode?: 'EMAIL_EXISTS' | 'CLIENT_LIMIT_REACHED' | 'INVALID_EMAIL' | 'INVALID_RUT' | 'ROLE_NOT_FOUND' | 'AUTH_ERROR' | 'PROFILE_ERROR' | 'UNKNOWN_ERROR'
}

/**
 * Valida el formato de un email
 */
export function validateEmail(email: string): boolean {
  if (!email || !email.trim()) {
    return false
  }
  
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email.trim())
}

/**
 * Valida el formato de un RUT chileno
 * Acepta formatos: 12345678-9, 12.345.678-9, 123456789
 */
export function validateRut(rut: string): { valid: boolean; cleaned?: string; error?: string } {
  if (!rut || !rut.trim()) {
    return { valid: false, error: 'RUT es requerido' }
  }

  // Limpiar el RUT: quitar puntos y guiones
  let cleaned = rut.replace(/\./g, '').replace(/-/g, '').trim().toUpperCase()
  
  if (cleaned.length < 7) {
    return { valid: false, error: 'RUT demasiado corto (mínimo 7 caracteres)' }
  }

  // Separar número y dígito verificador
  const body = cleaned.slice(0, -1)
  const dv = cleaned.slice(-1)

  // Validar que el cuerpo sea numérico
  if (!/^\d+$/.test(body)) {
    return { valid: false, error: 'RUT contiene caracteres inválidos' }
  }

  // Validar dígito verificador (puede ser número o K)
  if (!/^[\dK]$/.test(dv)) {
    return { valid: false, error: 'Dígito verificador inválido' }
  }

  // Calcular dígito verificador esperado
  // Algoritmo del RUT chileno:
  // 1. Multiplicar cada dígito (de derecha a izquierda) por la secuencia 2,3,4,5,6,7,2,3,4,5,6,7...
  // 2. Sumar todos los productos
  // 3. Obtener el resto de la división por 11
  // 4. Restar el resto de 11
  // 5. Si el resultado es 11, el dígito es '0'
  // 6. Si el resultado es 10, el dígito es 'K'
  // 7. En cualquier otro caso, el dígito es el resultado
  let sum = 0
  let multiplier = 2

  for (let i = body.length - 1; i >= 0; i--) {
    sum += parseInt(body[i]) * multiplier
    multiplier = multiplier === 7 ? 2 : multiplier + 1
  }

  const remainder = sum % 11
  const result = 11 - remainder
  let calculatedDv: string
  
  if (result === 11) {
    calculatedDv = '0'
  } else if (result === 10) {
    calculatedDv = 'K'
  } else {
    calculatedDv = result.toString()
  }

  if (dv !== calculatedDv) {
    return { valid: false, error: 'Dígito verificador inválido' }
  }

  return { valid: true, cleaned: body }
}

/**
 * Genera una contraseña a partir del RUT
 * Si el RUT es muy corto, genera una contraseña aleatoria segura
 */
export function generatePasswordFromRut(rut: string): { password: string; isRandom: boolean } {
  const rutValidation = validateRut(rut)
  
  if (!rutValidation.valid || !rutValidation.cleaned) {
    // Si el RUT no es válido, generar contraseña aleatoria
    return { password: generateRandomPassword(), isRandom: true }
  }

  const cleanedRut = rutValidation.cleaned

  // Si el RUT limpio tiene menos de 8 caracteres, generar contraseña aleatoria
  if (cleanedRut.length < 8) {
    return { password: generateRandomPassword(), isRandom: true }
  }

  // Usar el RUT como contraseña (mínimo 8 caracteres)
  return { password: cleanedRut, isRandom: false }
}

/**
 * Genera una contraseña aleatoria segura
 */
function generateRandomPassword(): string {
  const length = 12
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*'
  let password = ''
  
  // Asegurar al menos un carácter de cada tipo
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)]
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)]
  password += '0123456789'[Math.floor(Math.random() * 10)]
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)]
  
  // Completar el resto
  for (let i = password.length; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)]
  }
  
  // Mezclar los caracteres
  return password.split('').sort(() => Math.random() - 0.5).join('')
}

/**
 * Verifica si un email ya existe en auth.users
 * Usa getUserByEmail si está disponible, sino lista y filtra
 */
export async function checkEmailExistsInAuth(email: string): Promise<{ exists: boolean; userId?: string }> {
  try {
    const supabaseAdmin = createAdminClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false
        }
      }
    )

    // Intentar usar getUserByEmail (más eficiente)
    try {
      const { data: { user }, error } = await supabaseAdmin.auth.admin.getUserByEmail(email.trim())
      if (!error && user) {
        return { exists: true, userId: user.id }
      }
    } catch {
      // Si getUserByEmail no está disponible, usar listUsers
    }

    // Fallback: listar usuarios y filtrar (menos eficiente pero funciona)
    const { data: authUsersList, error: listError } = await supabaseAdmin.auth.admin.listUsers()
    if (!listError && authUsersList?.users) {
      const existingUser = authUsersList.users.find(u => u.email?.toLowerCase() === email.trim().toLowerCase())
      if (existingUser) {
        return { exists: true, userId: existingUser.id }
      }
    }

    return { exists: false }
  } catch (error) {
    console.error('Error checking email in auth:', error)
    // En caso de error, asumir que no existe para permitir intentar crear
    return { exists: false }
  }
}

/**
 * Verifica si un email ya existe en public.users
 */
export async function checkEmailExistsInPublicUsers(email: string): Promise<{ exists: boolean; userId?: string; clientId?: string }> {
  try {
    const supabase = await createClient()
    const { data: user, error } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('email', email.trim().toLowerCase())
      .single()

    if (error || !user) {
      return { exists: false }
    }

    return { exists: true, userId: user.id, clientId: user.client_id || undefined }
  } catch (error) {
    console.error('Error checking email in public.users:', error)
    return { exists: false }
  }
}

/**
 * Verifica si un cliente ya alcanzó el límite de usuarios (2 usuarios máximo)
 */
export async function checkClientUserLimit(clientId: string): Promise<{ atLimit: boolean; currentCount: number }> {
  try {
    const supabase = await createClient()
    const { data: users, error } = await supabase
      .from('users')
      .select('id')
      .eq('client_id', clientId)

    if (error) {
      console.error('Error checking client user limit:', error)
      return { atLimit: false, currentCount: 0 }
    }

    const count = users?.length || 0
    return { atLimit: count >= 2, currentCount: count }
  } catch (error) {
    console.error('Error checking client user limit:', error)
    return { atLimit: false, currentCount: 0 }
  }
}

/**
 * Obtiene el role_id de un rol por nombre
 */
export async function getRoleIdByName(roleName: string): Promise<{ roleId: number | null; error?: string }> {
  try {
    const supabase = await createClient()
    const { data: role, error } = await supabase
      .from('roles')
      .select('id')
      .eq('name', roleName)
      .single()

    if (error || !role) {
      return { roleId: null, error: `Rol '${roleName}' no encontrado` }
    }

    return { roleId: role.id }
  } catch (error) {
    console.error('Error getting role ID:', error)
    return { roleId: null, error: 'Error al obtener rol' }
  }
}

/**
 * Crea un usuario de forma atómica
 * Maneja rollback si falla cualquier paso
 */
export async function createUserAtomically(options: CreateUserOptions): Promise<CreateUserResult> {
  const { email, name, rut, companyId, clientId, roleName = 'consumidor' } = options

  // 1. Validar email
  if (!validateEmail(email)) {
    return {
      success: false,
      error: 'Email inválido',
      errorCode: 'INVALID_EMAIL'
    }
  }

  // 2. Validar RUT
  const rutValidation = validateRut(rut)
  if (!rutValidation.valid) {
    return {
      success: false,
      error: rutValidation.error || 'RUT inválido',
      errorCode: 'INVALID_RUT'
    }
  }

  // 3. Verificar si el email ya existe en auth.users
  const authCheck = await checkEmailExistsInAuth(email)
  if (authCheck.exists) {
    // Verificar si existe en public.users y si está vinculado a otro cliente
    const publicCheck = await checkEmailExistsInPublicUsers(email)
    
    if (publicCheck.exists) {
      if (publicCheck.clientId && publicCheck.clientId !== clientId) {
        return {
          success: false,
          error: 'El email ya está asociado a otro cliente',
          errorCode: 'EMAIL_EXISTS'
        }
      }
      // Si existe pero no tiene client_id o es el mismo, podemos vincularlo
      // Esto se manejará en el flujo principal
      return {
        success: false,
        error: 'El email ya existe en el sistema',
        errorCode: 'EMAIL_EXISTS',
        userId: publicCheck.userId
      }
    }
    
    // Existe en auth pero no en public.users (usuario huérfano)
    // Podríamos intentar crear el perfil, pero es un caso edge
    return {
      success: false,
      error: 'El email ya existe en auth pero no tiene perfil',
      errorCode: 'EMAIL_EXISTS',
      userId: authCheck.userId
    }
  }

  // 4. Verificar límite de usuarios por cliente
  const limitCheck = await checkClientUserLimit(clientId)
  if (limitCheck.atLimit) {
    return {
      success: false,
      error: `El cliente ya tiene ${limitCheck.currentCount} usuarios (máximo 2)`,
      errorCode: 'CLIENT_LIMIT_REACHED'
    }
  }

  // 5. Obtener role_id
  const roleResult = await getRoleIdByName(roleName)
  if (!roleResult.roleId) {
    return {
      success: false,
      error: roleResult.error || 'Rol no encontrado',
      errorCode: 'ROLE_NOT_FOUND'
    }
  }

  // 6. Generar contraseña
  const passwordResult = generatePasswordFromRut(rut)

  // 7. Crear usuario en auth.users
  const supabaseAdmin = createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  let authUserId: string | null = null

  try {
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email.trim(),
      password: passwordResult.password,
      email_confirm: true,
      user_metadata: {
        name: name.trim(),
        company_id: companyId,
        client_id: clientId
      }
    })

    if (createAuthError || !authUser.user) {
      return {
        success: false,
        error: createAuthError?.message || 'Error al crear usuario en auth',
        errorCode: 'AUTH_ERROR'
      }
    }

    authUserId = authUser.user.id

    // 8. Crear perfil en public.users
    const supabase = await createClient()
    const { data: newUser, error: createProfileError } = await supabase
      .from('users')
      .insert({
        id: authUserId,
        name: name.trim(),
        email: email.trim(),
        role_id: roleResult.roleId,
        company_id: companyId,
        client_id: clientId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createProfileError) {
      // Rollback: eliminar usuario de auth
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log(`✅ Rollback: Usuario eliminado de auth.users`)
      } catch (deleteError) {
        console.error('❌ Error en rollback (eliminar usuario de auth):', deleteError)
      }

      return {
        success: false,
        error: `Error al crear perfil: ${createProfileError.message}`,
        errorCode: 'PROFILE_ERROR'
      }
    }

    // 9. Éxito
    return {
      success: true,
      userId: authUserId,
      warning: passwordResult.isRandom 
        ? 'Se generó una contraseña aleatoria porque el RUT era muy corto' 
        : undefined
    }

  } catch (error) {
    // Rollback si hay error inesperado
    if (authUserId) {
      try {
        await supabaseAdmin.auth.admin.deleteUser(authUserId)
        console.log(`✅ Rollback: Usuario eliminado de auth.users`)
      } catch (deleteError) {
        console.error('❌ Error en rollback:', deleteError)
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido',
      errorCode: 'UNKNOWN_ERROR'
    }
  }
}

/**
 * Vincula un usuario existente a un cliente
 */
export async function linkExistingUserToClient(userId: string, clientId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const supabase = await createClient()
    
    // Verificar que el usuario existe
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, client_id')
      .eq('id', userId)
      .single()

    if (userError || !user) {
      return { success: false, error: 'Usuario no encontrado' }
    }

    // Si ya tiene un client_id diferente, no permitir
    if (user.client_id && user.client_id !== clientId) {
      return { success: false, error: 'El usuario ya está vinculado a otro cliente' }
    }

    // Si ya está vinculado al mismo cliente, éxito
    if (user.client_id === clientId) {
      return { success: true }
    }

    // Vincular al cliente
    const { error: updateError } = await supabase
      .from('users')
      .update({ client_id: clientId })
      .eq('id', userId)

    if (updateError) {
      return { success: false, error: updateError.message }
    }

    return { success: true }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Error desconocido'
    }
  }
}

