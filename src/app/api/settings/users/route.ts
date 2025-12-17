import { createClient } from '@/lib/supabase/server'
import { createClient as createAdminClient } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'
import { checkEmailExistsInAuth, checkEmailExistsInPublicUsers } from '@/lib/services/userCreationService'

export async function GET(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es admin usando una consulta con JOIN
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    // Verificar rol admin
    type RoleData = { id: number; name: string } | { id: number; name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener parámetro de búsqueda único
    const { searchParams } = new URL(request.url)
    const searchQuery = searchParams.get('search')?.trim()

    // Construir consulta base - obtener TODOS los usuarios, incluso los que no tienen rol
    // La sintaxis de Supabase con roles() hace LEFT JOIN automáticamente
    let query = supabase
      .from('users')
      .select(`
        id,
        name,
        email,
        created_at,
        role_id,
        client_id,
        roles (
          id,
          name
        ),
        clients (
          id,
          name,
          rut
        )
      `)
      // No aplicar ningún filtro que excluya usuarios sin role_id

    // Aplicar filtro de búsqueda única que busca en nombre, email o rol
    if (searchQuery) {
      // Normalizar la búsqueda para manejar diferentes formas de escribir el rol
      const normalizedQuery = searchQuery.toLowerCase().trim()
      
      // Mapeo de términos de búsqueda comunes a nombres de roles
      const roleSearchMap: Record<string, string[]> = {
        'admin': ['admin'],
        'administrador': ['admin'],
        'administradores': ['admin'],
        'validador': ['validador'],
        'validadores': ['validador'],
        'comun': ['comun'],
        'común': ['comun'],
        'consumidor': ['consumidor'],
        'consumidores': ['consumidor'],
      }
      
      // Buscar roles que coincidan con el término de búsqueda
      let matchingRoleIds: number[] = []
      
      // Primero intentar con el mapeo
      const mappedRoles = roleSearchMap[normalizedQuery]
      if (mappedRoles) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .in('name', mappedRoles)
        
        matchingRoleIds = roleData?.map(r => r.id) || []
      }
      
      // Si no se encontró con el mapeo, buscar directamente en la tabla de roles
      if (matchingRoleIds.length === 0) {
        const { data: roleData } = await supabase
          .from('roles')
          .select('id')
          .ilike('name', `%${searchQuery}%`)
        
        matchingRoleIds = roleData?.map(r => r.id) || []
      }

      // Construir la consulta OR
      const conditions: string[] = []
      
      // Siempre buscar en nombre y email
      conditions.push(`name.ilike.%${searchQuery}%`)
      conditions.push(`email.ilike.%${searchQuery}%`)
      
      // Si hay roles que coinciden, agregar búsqueda por role_id
      if (matchingRoleIds.length > 0) {
        conditions.push(`role_id.in.(${matchingRoleIds.join(',')})`)
      }
      
      // También buscar usuarios sin rol si el término de búsqueda podría referirse a "sin rol"
      const sinRolTerms = ['sin rol', 'sin roles', 'sinrole', 'sinroles', 'no rol', 'sin asignar']
      if (sinRolTerms.some(term => normalizedQuery.includes(term))) {
        conditions.push('role_id.is.null')
      }
      
      // Aplicar filtro OR combinado
      query = query.or(conditions.join(','))
    }

    // Ordenar y ejecutar
    // No aplicar ningún filtro que excluya usuarios sin role_id
    const { data: usersData, error: usersError } = await query
      .order('created_at', { ascending: false })

    if (usersError) {
      console.error('Error al obtener usuarios:', usersError)
      return NextResponse.json({ 
        error: 'Error al obtener usuarios',
        details: usersError.message 
      }, { status: 500 })
    }

    // Obtener usuarios no autorizados de auth.users que no tienen registro en public.users
    interface UnauthorizedUser {
      id: string
      name: string
      email: string
      role_id: null
      roles: null
      created_at: string
      isUnauthorized: true
    }
    let unauthorizedUsers: UnauthorizedUser[] = []
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

      // Obtener todos los usuarios de auth.users
      const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers()
      
      if (!authError && authUsers) {
        // Obtener IDs de usuarios que ya están en public.users
        interface UserWithId {
          id: string
          [key: string]: unknown
        }
        const publicUserIds = new Set((usersData || []).map((u: UserWithId) => u.id))
        
        // Filtrar usuarios que no están en public.users
        interface AuthUserInfo {
          id: string
          email?: string
          user_metadata?: { name?: string }
          created_at?: string
        }
        unauthorizedUsers = (authUsers.users || [])
          .filter((authUser: AuthUserInfo) => !publicUserIds.has(authUser.id))
          .map((authUser: AuthUserInfo) => ({
            id: authUser.id,
            name: authUser.user_metadata?.name || authUser.email?.split('@')[0] || 'Sin nombre',
            email: authUser.email || 'Sin email',
            role_id: null,
            roles: null,
            created_at: authUser.created_at || new Date().toISOString(),
            isUnauthorized: true // Flag para identificar usuarios no autorizados
          }))
      }
    } catch (error) {
      console.error('Error al obtener usuarios no autorizados:', error)
      // Continuar sin usuarios no autorizados si hay error
    }

    console.log(`Usuarios obtenidos de BD: ${usersData?.length || 0}`)
    console.log(`Usuarios no autorizados: ${unauthorizedUsers.length}`)
    if (usersData && usersData.length > 0) {
      interface UserWithRoleId {
        role_id: number | null | undefined
        [key: string]: unknown
      }
      const usersWithRole = usersData.filter((u: UserWithRoleId) => u.role_id !== null && u.role_id !== undefined)
      const usersWithoutRole = usersData.filter((u: UserWithRoleId) => u.role_id === null || u.role_id === undefined)
      console.log(`Usuarios con rol: ${usersWithRole.length}, Usuarios sin rol: ${usersWithoutRole.length}`)
    }

    // Formatear usuarios - incluir todos, incluso los que no tienen rol
    interface UserData {
      id: string
      name?: string
      email?: string
      role_id: number | null | undefined
      client_id?: string | null
      roles?: { id: number; name: string } | { id: number; name: string }[] | null
      clients?: { id: string; name: string; rut?: string } | { id: string; name: string; rut?: string }[] | null
      created_at?: string
    }
    const publicUsers = (usersData || []).map((user: UserData) => {
      // Extraer nombre del rol - manejar casos donde role_id es null o roles es null/undefined
      let roleName = 'Sin rol'
      let roleId: number | null = null
      
      // Verificar si tiene role_id asignado (null, undefined o 0 se consideran sin rol)
      if (user.role_id !== null && user.role_id !== undefined) {
        roleId = user.role_id
        // Si tiene role_id, intentar extraer el nombre del rol
        if (user.roles) {
          if (Array.isArray(user.roles) && user.roles.length > 0 && user.roles[0]) {
            roleName = user.roles[0].name || 'Sin rol'
          } else if (typeof user.roles === 'object' && user.roles !== null && 'name' in user.roles) {
            roleName = user.roles.name || 'Sin rol'
          }
        }
        // Si tiene role_id pero no se pudo extraer el nombre, mantener "Sin rol"
      }
      // Si role_id es null o undefined, mantener "Sin rol" (ya está asignado por defecto)

      // Extraer información del cliente vinculado
      // Manejar tanto array como objeto para la relación clients
      let clientName: string | null = null
      if (user.client_id && user.clients) {
        const clientData = Array.isArray(user.clients) ? user.clients[0] : user.clients
        if (clientData && typeof clientData === 'object' && 'name' in clientData) {
          clientName = clientData.name || null
        }
      }

      return {
        id: user.id,
        name: user.name || 'Sin nombre',
        email: user.email || 'Sin email',
        role: roleName, // Devolver el nombre del rol como está en la BD (admin, validador, etc.)
        role_id: roleId, // Incluir role_id para referencia
        client_id: user.client_id || null,
        client_name: clientName,
        created_at: user.created_at || new Date().toISOString(),
        isUnauthorized: false
      }
    })

    // Formatear usuarios no autorizados
    const unauthorizedFormatted = unauthorizedUsers.map((user: UnauthorizedUser) => ({
      id: user.id,
      name: user.name || 'Sin nombre',
      email: user.email || 'Sin email',
      role: 'Sin autorizar',
      role_id: null,
      created_at: user.created_at || new Date().toISOString(),
      isUnauthorized: true
    }))

    // Aplicar filtro de búsqueda también a usuarios no autorizados
    interface FormattedUser {
      id: string
      name: string
      email: string
      role: string
      created_at: string
      isUnauthorized?: boolean
    }
    let filteredUnauthorized = unauthorizedFormatted
    if (searchQuery) {
      const normalizedQuery = searchQuery.toLowerCase().trim()
      filteredUnauthorized = unauthorizedFormatted.filter((user: FormattedUser) => {
        const nameMatch = user.name?.toLowerCase().includes(normalizedQuery)
        const emailMatch = user.email?.toLowerCase().includes(normalizedQuery)
        const sinAutorizarMatch = ['sin autorizar', 'sin autoriz', 'no autorizado', 'pendiente', 'unauthorized']
          .some(term => normalizedQuery.includes(term))
        return nameMatch || emailMatch || sinAutorizarMatch
      })
    }

    // Combinar usuarios de public.users y usuarios no autorizados (filtrados)
    const allUsers = [...publicUsers, ...filteredUnauthorized]
    
    // Ordenar por fecha de creación (más recientes primero)
    allUsers.sort((a, b) => {
      const dateA = new Date(a.created_at).getTime()
      const dateB = new Date(b.created_at).getTime()
      return dateB - dateA
    })
    
    console.log(`Total de usuarios obtenidos: ${allUsers.length}`)
    console.log(`Usuarios autorizados: ${publicUsers.length}`)
    console.log(`Usuarios no autorizados: ${filteredUnauthorized.length}`)
    console.log(`Usuarios sin rol: ${allUsers.filter(u => u.role === 'Sin rol').length}`)

    return NextResponse.json({ users: allUsers })
  } catch (error) {
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    // Verificar autenticación
    const supabase = await createClient()
    const { data: { user }, error: authError } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'No autenticado' }, { status: 401 })
    }

    // Verificar que el usuario es admin y obtener su company_id
    const { data: currentUser, error: userError } = await supabase
      .from('users')
      .select('role_id, company_id, roles(name)')
      .eq('id', user.id)
      .single()

    if (userError || !currentUser) {
      return NextResponse.json({ error: 'Error al obtener información del usuario' }, { status: 500 })
    }

    // Verificar rol admin
    type RoleData = { id: number; name: string } | { id: number; name: string }[]
    const roleData = currentUser.roles as RoleData
    const role = Array.isArray(roleData) 
      ? roleData[0]?.name 
      : roleData?.name

    if (role !== 'admin') {
      return NextResponse.json({ error: 'Acceso denegado' }, { status: 403 })
    }

    // Obtener datos del body
    const body = await request.json()
    const { name, email, password, role_id, client_id } = body

    if (!name || !email) {
      return NextResponse.json({ error: 'Nombre y email son requeridos' }, { status: 400 })
    }

    // Obtener información del rol seleccionado
    let selectedRoleName: string | null = null
    if (role_id) {
      const { data: selectedRole, error: roleError } = await supabase
        .from('roles')
        .select('name')
        .eq('id', role_id)
        .single()
      
      if (!roleError && selectedRole) {
        selectedRoleName = selectedRole.name
      }
    }

    // Validar si el email ya existe antes de intentar crear el usuario
    const authCheck = await checkEmailExistsInAuth(email)
    const publicCheck = await checkEmailExistsInPublicUsers(email)
    
    if (authCheck.exists || publicCheck.exists) {
      let errorMessage = 'El email ya está registrado en el sistema'
      
      if (publicCheck.exists && publicCheck.clientId) {
        // Intentar obtener el nombre del cliente para el mensaje
        const { data: clientData } = await supabase
          .from('clients')
          .select('name')
          .eq('id', publicCheck.clientId)
          .single()
        
        if (clientData) {
          errorMessage = `El email ya está registrado y está asociado al cliente "${clientData.name}"`
        } else {
          errorMessage = 'El email ya está registrado y está asociado a un cliente'
        }
      } else if (authCheck.exists && !publicCheck.exists) {
        errorMessage = 'El email ya está registrado pero no tiene perfil de usuario completo'
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        errorCode: 'EMAIL_EXISTS',
        details: 'Por favor, utiliza un email diferente o contacta al administrador si necesitas recuperar acceso a esta cuenta.'
      }, { status: 409 })
    }

    // Determinar la contraseña según el rol
    // Para validador, comun o admin: usar contraseña por defecto
    // Para otros roles (consumidor): usar la contraseña proporcionada
    const DEFAULT_PASSWORD = 'n3M4Ch1L3'
    let finalPassword: string
    
    if (selectedRoleName === 'validador' || selectedRoleName === 'comun' || selectedRoleName === 'admin') {
      finalPassword = DEFAULT_PASSWORD
    } else {
      // Para consumidor u otros roles, usar la contraseña proporcionada
      if (!password) {
        return NextResponse.json({ error: 'Contraseña es requerida para este rol' }, { status: 400 })
      }
      finalPassword = password
    }

    // Determinar company_id y client_id según el rol
    let finalCompanyId: string | null = null
    let finalClientId: string | null = null

    if (selectedRoleName === 'consumidor') {
      // Si es consumidor, debe tener client_id
      if (!client_id) {
        return NextResponse.json({ 
          error: 'El rol "consumidor" requiere que se seleccione un cliente' 
        }, { status: 400 })
      }
      
      // Obtener el company_id del cliente
      const { data: clientData, error: clientError } = await supabase
        .from('clients')
        .select('company_id')
        .eq('id', client_id)
        .single()
      
      if (clientError || !clientData) {
        return NextResponse.json({ 
          error: 'Cliente no encontrado' 
        }, { status: 400 })
      }
      
      finalClientId = client_id
      finalCompanyId = clientData.company_id
    } else if (selectedRoleName && selectedRoleName !== 'admin') {
      // Para otros roles (excepto admin), usar company_id del usuario que crea
      if (!currentUser.company_id) {
        return NextResponse.json({ 
          error: 'El usuario actual no tiene company_id asignado' 
        }, { status: 400 })
    }
      finalCompanyId = currentUser.company_id
      finalClientId = null
    }
    // Si es admin, no se asigna company_id ni client_id (ambos null)

    // Crear cliente admin para crear usuario en auth.users
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

    // Crear usuario en auth.users
    const { data: authUser, error: createAuthError } = await supabaseAdmin.auth.admin.createUser({
      email: email,
      password: finalPassword,
      email_confirm: true,
      user_metadata: {
        name: name,
        company_id: finalCompanyId,
        client_id: finalClientId
      }
    })

    if (createAuthError || !authUser.user) {
      // Detectar errores comunes de Supabase Auth
      let errorMessage = 'Error al crear usuario'
      let errorDetails = createAuthError?.message || 'Error desconocido'
      
      if (createAuthError?.message) {
        const errorMsg = createAuthError.message.toLowerCase()
        if (errorMsg.includes('already registered') || errorMsg.includes('already exists') || errorMsg.includes('user already exists')) {
          errorMessage = 'El email ya está registrado en el sistema'
          errorDetails = 'Este email ya tiene una cuenta. Por favor, utiliza un email diferente.'
        } else if (errorMsg.includes('invalid email')) {
          errorMessage = 'Email inválido'
          errorDetails = 'El formato del email no es válido. Por favor, verifica que el email esté correctamente escrito.'
        } else if (errorMsg.includes('password')) {
          errorMessage = 'Error con la contraseña'
          errorDetails = 'La contraseña no cumple con los requisitos de seguridad.'
        }
      }
      
      return NextResponse.json({ 
        error: errorMessage,
        details: errorDetails,
        errorCode: 'AUTH_ERROR'
      }, { status: 500 })
    }

    // Crear perfil en public.users
    const { data: newUser, error: createProfileError } = await supabase
      .from('users')
      .insert({
        id: authUser.user.id,
        name: name,
        email: email,
        role_id: role_id || null,
        company_id: finalCompanyId,
        client_id: finalClientId,
        created_at: new Date().toISOString()
      })
      .select()
      .single()

    if (createProfileError) {
      // Si falla la creación del perfil, eliminar el usuario de auth
      console.error('Error al crear perfil:', createProfileError)
      await supabaseAdmin.auth.admin.deleteUser(authUser.user.id)
      return NextResponse.json({ 
        error: 'Error al crear perfil de usuario',
        details: createProfileError.message 
      }, { status: 500 })
    }

    return NextResponse.json({ 
      message: 'Usuario creado exitosamente',
      user: newUser 
    }, { status: 201 })
  } catch (error) {
    console.error('Error en POST /api/settings/users:', error)
    return NextResponse.json({ 
      error: 'Error interno del servidor',
      details: error instanceof Error ? error.message : 'Error desconocido'
    }, { status: 500 })
  }
}
